"""封裝回測服務，將桌面框架導入 FastAPI 環境"""
from __future__ import annotations

import json
import logging
import os
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

# 確保可以導入原始回測框架
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

from khFrame import KhQuantFramework  # noqa: E402

from .callbacks import BackendGUIAdapter, BackendTraderCallback
from ..schemas.backtest import (
    BacktestRequest,
    BacktestResponse,
    BacktestSummary,
    FileDescriptor,
    LogEntryModel,
)

LOGGER = logging.getLogger("lazybacktest.backend.service")


class BacktestService:
    """使用原有 KhQuantFramework 完成回測執行"""

    def __init__(self, *, result_root: Optional[Path] = None) -> None:
        self.result_root = result_root or (REPO_ROOT / "backtest_results")
        self.result_root.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    def run_backtest(self, request: BacktestRequest) -> BacktestResponse:
        strategy_path = self._resolve_strategy(request)
        config = self._prepare_config(request, strategy_path)

        gui_adapter = BackendGUIAdapter(LOGGER)
        callback = BackendTraderCallback(gui_adapter)
        gui_adapter.progress_signal.connect(
            lambda value: LOGGER.debug(
                "回測進度 %.2f%%", float(value or 0.0)
            )
        )

        backtest_identifier = uuid.uuid4().hex
        gui_adapter.log_message(f"啟動回測任務: {backtest_identifier}")

        with tempfile.TemporaryDirectory(prefix="lazybacktest_") as temp_dir:
            config_path = Path(temp_dir) / "config.kh"
            with config_path.open("w", encoding="utf-8") as handler:
                json.dump(config, handler, ensure_ascii=False, indent=4)

            original_cwd = os.getcwd()
            os.chdir(REPO_ROOT)
            try:
                framework = KhQuantFramework(
                    str(config_path),
                    strategy_path,
                    trader_callback=callback,
                    headless=True,
                )
                framework.run()
            finally:
                os.chdir(original_cwd)

        backtest_dir = gui_adapter.last_backtest_dir
        if not backtest_dir:
            raise RuntimeError("未取得回測結果輸出路徑，請檢查配置是否完整")

        backtest_path = Path(backtest_dir)
        if not backtest_path.is_absolute():
            backtest_path = (REPO_ROOT / backtest_path).resolve()

        summary = self._collect_summary(backtest_path)
        logs = [LogEntryModel(**entry) for entry in gui_adapter.get_logs()]

        return BacktestResponse(
            backtest_id=backtest_identifier,
            backtest_directory=str(backtest_path),
            summary=summary,
            logs=logs,
        )

    # ------------------------------------------------------------------
    def _prepare_config(self, request: BacktestRequest, strategy_path: str) -> Dict[str, Any]:
        config = json.loads(json.dumps(request.config))  # 深拷貝

        if "backtest" not in config:
            raise ValueError("配置缺少 backtest 區塊")
        if "data" not in config:
            raise ValueError("配置缺少 data 區塊")
        if not config["data"].get("stock_list") and not config["data"].get("stock_pool"):
            raise ValueError("data.stock_list 至少需要設定一檔標的")

        if "run_mode" not in config:
            config["run_mode"] = "backtest"
        config.setdefault("system", {})
        config.setdefault("account", {})
        config.setdefault("market_callback", {})
        config.setdefault("risk", {})

        config["strategy_file"] = strategy_path

        return config

    def _resolve_strategy(self, request: BacktestRequest) -> str:
        strategy_path = request.strategy_path
        if not strategy_path:
            strategy_path = request.config.get("strategy_file")
        if not strategy_path:
            raise ValueError("未提供策略檔案路徑")

        candidate = (REPO_ROOT / strategy_path).resolve()
        strategies_dir = (REPO_ROOT / "strategies").resolve()
        if not str(candidate).startswith(str(strategies_dir)):
            raise ValueError("策略檔案必須位於 strategies 目錄下")
        if not candidate.exists():
            raise FileNotFoundError(f"策略檔案不存在: {candidate}")

        return str(candidate)

    def _collect_summary(self, backtest_dir: Path) -> BacktestSummary:
        files: List[FileDescriptor] = []
        for filename in ["config.csv", "daily_stats.csv", "trades.csv", "benchmark.csv"]:
            path = backtest_dir / filename
            files.append(FileDescriptor(name=filename, path=str(path), exists=path.exists()))

        daily_stats_path = backtest_dir / "daily_stats.csv"
        trade_count = 0
        pnl = None
        final_asset = None
        start = None
        end = None
        if daily_stats_path.exists():
            data_frame = pd.read_csv(daily_stats_path)
            if not data_frame.empty:
                trade_series = data_frame.get("trade_count")
                if trade_series is not None and not trade_series.empty:
                    trade_count = int(trade_series.iloc[-1])
            if "total_asset" in data_frame.columns and not data_frame.empty:
                final_asset = float(data_frame["total_asset"].iloc[-1])
            if "pnl" in data_frame.columns and not data_frame.empty:
                pnl = float(data_frame["pnl"].iloc[-1])
            if "date" in data_frame.columns and not data_frame.empty:
                start = data_frame["date"].iloc[0]
                end = data_frame["date"].iloc[-1]

        config_path = backtest_dir / "config.csv"
        init_capital = None
        benchmark = None
        if config_path.exists():
            config_df = pd.read_csv(config_path)
            if "init_capital" in config_df.columns:
                init_capital = float(config_df["init_capital"].iloc[0])
            if "benchmark" in config_df.columns:
                benchmark = config_df["benchmark"].iloc[0]

        return BacktestSummary(
            files=files,
            init_capital=init_capital,
            final_asset=final_asset,
            pnl=pnl,
            trade_count=trade_count,
            start_date=start,
            end_date=end,
            benchmark=benchmark,
        )
