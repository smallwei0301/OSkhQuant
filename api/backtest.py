"""Utilities for running background backtests."""
from __future__ import annotations

import importlib.util
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Dict, List
from uuid import uuid4

import pandas as pd

from khConfig import KhConfig
from khQTTools import KhQuTools, khHistory
from khTrade import KhTradeManager

from .schemas import BacktestRunRequest, BacktestTaskStatus

LOGGER = logging.getLogger(__name__)


class APIGuiLogger:
    """Lightweight logger used to capture框架訊息."""

    def __init__(self, task_id: str) -> None:
        self.task_id = task_id
        self.messages: List[str] = []

    def log_message(self, message: str, level: str = "INFO") -> None:
        formatted = f"[{level}] {message}"
        LOGGER.info("[task:%s] %s", self.task_id, formatted)
        self.messages.append(formatted)


class BacktestTaskManager:
    """Manage asynchronous backtest tasks."""

    def __init__(self) -> None:
        self._executor = ThreadPoolExecutor(max_workers=2)
        self._tasks: Dict[str, BacktestTaskStatus] = {}
        self._lock = threading.Lock()

    def submit(self, request: BacktestRunRequest) -> BacktestTaskStatus:
        task_id = uuid4().hex
        status = BacktestTaskStatus(
            task_id=task_id,
            status="pending",
            detail="任務已建立，準備啟動",
            started_at=datetime.utcnow(),
        )
        with self._lock:
            self._tasks[task_id] = status

        self._executor.submit(self._run_task, task_id, request)
        return status

    def get(self, task_id: str) -> BacktestTaskStatus:
        with self._lock:
            if task_id not in self._tasks:
                raise KeyError(task_id)
            return self._tasks[task_id]

    # ---- internal helpers -------------------------------------------------
    def _run_task(self, task_id: str, request: BacktestRunRequest) -> None:
        logger = APIGuiLogger(task_id)
        with self._lock:
            self._tasks[task_id].status = "running"
            self._tasks[task_id].detail = "載入設定與策略中"

        try:
            result_path = execute_backtest(request, logger)
            with self._lock:
                self._tasks[task_id].status = "completed"
                self._tasks[task_id].detail = "回測流程完成"
                self._tasks[task_id].result_path = result_path
                self._tasks[task_id].finished_at = datetime.utcnow()
        except Exception as exc:  # pylint: disable=broad-except
            LOGGER.exception("Backtest task %s failed", task_id)
            with self._lock:
                self._tasks[task_id].status = "failed"
                self._tasks[task_id].detail = str(exc)
                self._tasks[task_id].finished_at = datetime.utcnow()


def execute_backtest(request: BacktestRunRequest, logger: APIGuiLogger) -> str:
    """Run a lightweight backtest routine for API usage.

    The implementation focuses on資料準備與策略載入，並以最新一筆歷史資料觸發
    策略邏輯，確保策略可在無GUI環境下驗證。
    """
    config = KhConfig(request.config_path)
    strategy_module = _load_strategy_module(request.strategy_path)

    stock_list = config.get_stock_list()
    if not stock_list:
        raise ValueError("設定檔中未找到股票池(stock_list)")

    logger.log_message(f"載入策略: {Path(request.strategy_path).name}")
    logger.log_message(f"股票池共 {len(stock_list)} 檔")

    framework = SimpleNamespace(config=config, tools=KhQuTools())
    trade_manager = KhTradeManager(config)
    account_state = {
        "cash": config.initial_cash,
        "frozen_cash": 0.0,
        "market_value": 0.0,
        "total_asset": config.initial_cash,
    }

    init_data = {
        "__current_time__": {
            "timestamp": int(datetime.utcnow().timestamp()),
            "datetime": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "time": datetime.utcnow().strftime("%H:%M:%S"),
        },
        "__account__": account_state,
        "__positions__": {},
        "__stock_list__": stock_list,
        "__framework__": framework,
    }

    if hasattr(strategy_module, "init"):
        strategy_module.init(stock_list, init_data)
        logger.log_message("策略初始化完成")

    # 載入歷史資料
    history = khHistory(
        symbol_list=stock_list,
        fields=request.fields,
        bar_count=request.bar_count,
        fre_step=config.kline_period,
        current_time=config.backtest_end,
        skip_paused=False,
        fq=request.fq,
        force_download=False,
    )

    latest_timestamp = None
    data_payload: Dict[str, Dict[str, object]] = {}
    for code, df in history.items():
        if df is None or df.empty:
            continue
        if "time" in df.columns:
            last_row = df.iloc[-1]
            latest_timestamp = last_row["time"]
            payload = last_row.to_dict()
            payload.pop("time", None)
        else:
            last_row = df.iloc[-1]
            payload = last_row.to_dict()
        data_payload[code] = payload

    if not data_payload:
        raise ValueError("無法取得歷史行情資料，請確認行情環境")

    if isinstance(latest_timestamp, pd.Timestamp):
        timestamp = latest_timestamp.to_pydatetime()
    else:
        timestamp = datetime.utcnow()

    context = {
        **data_payload,
        "__current_time__": {
            "timestamp": int(timestamp.timestamp()),
            "datetime": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "date": timestamp.strftime("%Y-%m-%d"),
            "time": timestamp.strftime("%H:%M:%S"),
        },
        "__account__": account_state,
        "__positions__": {},
        "__stock_list__": stock_list,
        "__framework__": framework,
        "__trade_manager__": trade_manager,
    }

    if hasattr(strategy_module, "khHandlebar"):
        signals = strategy_module.khHandlebar(context)
        logger.log_message(f"策略執行完成，產生 {len(signals) if signals else 0} 筆信號")
    else:
        logger.log_message("策略未實作 khHandlebar 函數", level="WARNING")

    result_directory = Path("backtest_results")
    result_directory.mkdir(exist_ok=True)
    result_file = result_directory / f"preview_{Path(request.strategy_path).stem}.log"
    result_file.write_text("\n".join(logger.messages), encoding="utf-8")

    return str(result_file)


def _load_strategy_module(strategy_path: str):
    strategy_spec = importlib.util.spec_from_file_location("strategy", strategy_path)
    if strategy_spec is None or strategy_spec.loader is None:
        raise ImportError(f"無法載入策略檔案: {strategy_path}")
    module = importlib.util.module_from_spec(strategy_spec)
    strategy_spec.loader.exec_module(module)  # type: ignore[assignment]
    return module
