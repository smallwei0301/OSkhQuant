"""Utilities for running background backtests."""
from __future__ import annotations

import importlib.util
import logging
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Dict, List, Optional

import pandas as pd
from celery import states
from celery.result import AsyncResult

from khConfig import KhConfig
from khQTTools import KhQuTools, khHistory
from khTrade import KhTradeManager

from .celery_app import celery_app
from .schemas import BacktestRunRequest, BacktestTaskStatus
from .tasks import run_backtest_task

LOGGER = logging.getLogger(__name__)


class APIGuiLogger:
    """Backtest logger that records messages and optionally forwards callbacks."""

    def __init__(self, callback: Optional[Any] = None) -> None:
        self._callback = callback
        self.messages: List[str] = []

    def log_message(self, message: str, level: str = "INFO") -> None:
        formatted = f"[{level}] {message}"
        LOGGER.info(formatted)
        self.messages.append(formatted)
        if self._callback:
            try:
                self._callback(message, level)
            except Exception:  # pylint: disable=broad-except
                LOGGER.exception("Backtest task callback failed")


class BacktestTaskManager:
    """Proxy helper that submits and inspects Celery backtest tasks."""

    def submit(self, request: BacktestRunRequest) -> BacktestTaskStatus:
        payload = request.dict()
        async_result = run_backtest_task.delay(payload)
        LOGGER.info("Queued backtest task %s", async_result.id)
        return BacktestTaskStatus(
            task_id=async_result.id,
            status="pending",
            detail="任務已送出，等待執行",
            started_at=datetime.utcnow(),
            progress=0.0,
            backtest_id=None,
        )

    def get(self, task_id: str) -> BacktestTaskStatus:
        result = AsyncResult(task_id, app=celery_app)
        if result is None or result.id is None:
            raise KeyError(task_id)

        meta = result.info or {}

        status = _map_state(result.state)
        detail = meta.get("detail") if isinstance(meta, dict) else None
        result_path = None
        backtest_id = None
        progress = None
        logs: List[Dict[str, Any]] = []

        if isinstance(meta, dict):
            result_payload = meta.get("result")
            if isinstance(result_payload, dict):
                result_path = result_payload.get("result_path")
                backtest_id = result_payload.get("backtest_id")
            progress = meta.get("progress")
            logs = meta.get("logs", [])

        started_at = _parse_datetime(meta.get("started_at")) if isinstance(meta, dict) else None
        finished_at = _parse_datetime(meta.get("finished_at")) if isinstance(meta, dict) else None

        if result.state == states.SUCCESS and isinstance(result.result, dict) and not result_path:
            result_path = result.result.get("result_path")
            backtest_id = backtest_id or result.result.get("backtest_id")

        return BacktestTaskStatus(
            task_id=task_id,
            status=status,
            detail=detail,
            result_path=result_path,
            backtest_id=backtest_id,
            started_at=started_at or datetime.utcnow(),
            finished_at=finished_at,
            progress=progress,
            logs=logs,
        )


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

    signals = []
    if hasattr(strategy_module, "khHandlebar"):
        signals = strategy_module.khHandlebar(context) or []
        logger.log_message(f"策略執行完成，產生 {len(signals)} 筆信號")
    else:
        logger.log_message("策略未實作 khHandlebar 函數", level="WARNING")

    try:
        trade_manager.process_signals(signals)
    except Exception as exc:  # pylint: disable=broad-except
        logger.log_message(f"處理交易信號發生例外: {exc}", level="ERROR")

    report_payload = trade_manager.generate_report()
    report_payload["signals"] = signals
    report_payload["messages"] = logger.messages

    result_directory = Path("backtest_results")
    result_directory.mkdir(exist_ok=True)
    result_file = result_directory / f"preview_{Path(request.strategy_path).stem}.log"
    result_file.write_text("\n".join(logger.messages), encoding="utf-8")

    return {"result_path": str(result_file), "report": report_payload}


def _load_strategy_module(strategy_path: str):
    strategy_spec = importlib.util.spec_from_file_location("strategy", strategy_path)
    if strategy_spec is None or strategy_spec.loader is None:
        raise ImportError(f"無法載入策略檔案: {strategy_path}")
    module = importlib.util.module_from_spec(strategy_spec)
    strategy_spec.loader.exec_module(module)  # type: ignore[assignment]
    return module


def _map_state(state: str) -> str:
    mapping = {
        states.PENDING: "pending",
        states.STARTED: "running",
        "PROGRESS": "running",
        states.SUCCESS: "completed",
        states.FAILURE: "failed",
        states.RETRY: "running",
    }
    return mapping.get(state, "pending")


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
