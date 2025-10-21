"""Celery tasks for Lazybacktest backend."""
from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from celery import Task, states
from celery.utils.log import get_task_logger

from khQTTools import download_and_store_data, supplement_history_data

from .backtest import APIGuiLogger, BacktestRunRequest, execute_backtest
from .celery_app import celery_app
from .notifications import TaskEvent, notify_failure, notify_retry, notify_success
from .schemas import (
    DataDownloadRequest,
    KhFrameTaskRequest,
    SupplementHistoryRequest,
)
from .task_tracking import append_log, initialize_meta, set_progress, set_result, set_status

LOGGER = get_task_logger(__name__)


class TrackedTask(Task):
    """Celery task base class that keeps detailed progress metadata."""

    abstract = True

    def __call__(self, *args: Any, **kwargs: Any) -> Any:  # type: ignore[override]
        self._meta: Dict[str, Any] = initialize_meta("任務已建立")
        return super().__call__(*args, **kwargs)

    # ------------------------------------------------------------------
    def init_meta(self, detail: str) -> Dict[str, Any]:
        meta = initialize_meta(detail)
        meta = set_status(meta, "running")
        meta["started_at"] = datetime.utcnow().isoformat() + "Z"
        self._meta = meta
        self.update_state(state=states.STARTED, meta=meta)
        return meta

    def push_log(
        self,
        message: str,
        *,
        level: str = "INFO",
        progress: Optional[float] = None,
        state: str = "PROGRESS",
    ) -> Dict[str, Any]:
        meta = append_log(getattr(self, "_meta", initialize_meta(message)), message, level)
        meta = set_progress(meta, progress)
        status_value = "completed" if state == states.SUCCESS else "running"
        meta = set_status(meta, status_value)
        self._meta = meta
        self.update_state(state=state, meta=meta)
        return meta

    def _complete(self, message: str, result: Dict[str, Any]) -> Dict[str, Any]:
        meta = append_log(getattr(self, "_meta", initialize_meta(message)), message)
        meta = set_progress(meta, 1.0)
        meta = set_status(meta, "completed")
        meta = set_result(meta, result)
        meta["finished_at"] = datetime.utcnow().isoformat() + "Z"
        self._meta = meta
        self.update_state(state=states.SUCCESS, meta=meta)
        return meta

    def fail(self, message: str) -> Dict[str, Any]:
        meta = append_log(getattr(self, "_meta", initialize_meta(message)), message, level="ERROR")
        meta = set_status(meta, "failed")
        meta["finished_at"] = datetime.utcnow().isoformat() + "Z"
        self._meta = meta
        self.update_state(state=states.FAILURE, meta=meta)
        return meta

    # ------------------------------------------------------------------
    def on_success(self, retval: Any, task_id: str, args: Any, kwargs: Any) -> None:  # type: ignore[override]
        payload = retval if isinstance(retval, dict) else {"result": retval}
        meta = self._complete("任務執行完成", payload)
        notify_success(TaskEvent(task_id=task_id, state=states.SUCCESS, message="任務完成", meta=meta))
        super().on_success(retval, task_id, args, kwargs)

    def on_failure(self, exc: Exception, task_id: str, args: Any, kwargs: Any, einfo: Any) -> None:  # type: ignore[override]
        meta = self.fail(str(exc))
        notify_failure(TaskEvent(task_id=task_id, state=states.FAILURE, message=str(exc), meta=meta))
        super().on_failure(exc, task_id, args, kwargs, einfo)

    def on_retry(self, exc: Exception, task_id: str, args: Any, kwargs: Any, einfo: Any) -> None:  # type: ignore[override]
        meta = append_log(getattr(self, "_meta", initialize_meta(str(exc))), f"任務將重試: {exc}", level="WARNING")
        meta = set_status(meta, "retrying")
        self._meta = meta
        notify_retry(TaskEvent(task_id=task_id, state=states.RETRY, message=str(exc), meta=meta))
        super().on_retry(exc, task_id, args, kwargs, einfo)


def _progress_to_ratio(progress: Optional[Any]) -> Optional[float]:
    try:
        if progress is None:
            return None
        return float(progress) / 100.0
    except (TypeError, ValueError):
        return None


@celery_app.task(
    name="lazybacktest.download_data",
    bind=True,
    base=TrackedTask,
    autoretry_for=(ConnectionError,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def download_data_task(self: TrackedTask, payload: Dict[str, Any]) -> Dict[str, Any]:
    request = DataDownloadRequest(**payload)
    self.init_meta("開始下載行情資料")

    target_path = Path(request.local_data_path).expanduser()
    target_path.mkdir(parents=True, exist_ok=True)
    self.push_log(f"資料將儲存於 {target_path}")

    def log_callback(message: str) -> None:
        self.push_log(message)

    def progress_callback(progress: Any) -> None:
        ratio = _progress_to_ratio(progress)
        if ratio is not None:
            self.push_log(f"下載進度 {int(float(progress))}%", progress=ratio)

    download_and_store_data(
        local_data_path=str(target_path),
        stock_files=request.stock_files,
        field_list=request.field_list,
        period_type=request.period_type,
        start_date=request.start_date,
        end_date=request.end_date,
        dividend_type=request.dividend_type,
        time_range=request.time_range,
        progress_callback=progress_callback,
        log_callback=log_callback,
    )

    saved_files = [
        str(file_path)
        for file_path in target_path.glob("*.csv")
        if request.period_type in file_path.name
    ]

    self.push_log("資料下載完成", progress=1.0, state=states.SUCCESS)
    return {
        "saved_files": sorted(saved_files),
        "local_data_path": str(target_path),
    }


@celery_app.task(
    name="lazybacktest.supplement_history",
    bind=True,
    base=TrackedTask,
    autoretry_for=(ConnectionError,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def supplement_history_task(self: TrackedTask, payload: Dict[str, Any]) -> Dict[str, Any]:
    request = SupplementHistoryRequest(**payload)
    self.init_meta("開始補充歷史資料")

    def log_callback(message: str) -> None:
        self.push_log(message)

    def progress_callback(progress: Any) -> None:
        ratio = _progress_to_ratio(progress)
        if ratio is not None:
            self.push_log(f"補充進度 {int(float(progress))}%", progress=ratio)

    supplement_history_data(
        stock_files=request.stock_files,
        field_list=request.field_list,
        period_type=request.period_type,
        start_date=request.start_date,
        end_date=request.end_date,
        dividend_type=request.dividend_type,
        time_range=request.time_range,
        progress_callback=progress_callback,
        log_callback=log_callback,
    )

    self.push_log("歷史資料補充完成", progress=1.0, state=states.SUCCESS)
    return {
        "message": "歷史資料補充完成",
        "stock_files": request.stock_files,
    }


@celery_app.task(
    name="lazybacktest.backtest",
    bind=True,
    base=TrackedTask,
)
def run_backtest_task(self: TrackedTask, payload: Dict[str, Any]) -> Dict[str, Any]:
    request = BacktestRunRequest(**payload)
    self.init_meta("回測任務啟動")

    def _callback(message: str, level: str = "INFO") -> None:
        self.push_log(message, level=level)

    logger = APIGuiLogger(callback=_callback)
    result_path = execute_backtest(request, logger)
    self.push_log("回測流程完成", progress=1.0, state=states.SUCCESS)
    return {"result_path": result_path}


@celery_app.task(
    name="lazybacktest.khframe.pipeline",
    bind=True,
    base=TrackedTask,
)
def khframe_pipeline_task(self: TrackedTask, payload: Dict[str, Any]) -> Dict[str, Any]:
    request = KhFrameTaskRequest(**payload)
    self.init_meta("啟動 KhFrame 任務")

    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

    try:
        from PyQt5.QtCore import QCoreApplication
        if QCoreApplication.instance() is None:
            QCoreApplication([])
    except Exception:  # pylint: disable=broad-except
        LOGGER.warning("QCoreApplication 初始化失敗，可能在非GUI環境執行")

    from khFrame import KhQuantFramework  # import lazily to avoid heavy import at startup

    self.push_log("載入框架設定")
    framework = KhQuantFramework(request.config_path, request.strategy_path)

    self.push_log("初始化交易帳戶")
    framework.init_trader_and_account()

    if request.initialize_data:
        self.push_log("準備下載初始行情資料")
        framework.init_data()

    if request.run_once:
        self.push_log("執行策略主流程")
        framework.run()
        framework.stop()

    self.push_log("KhFrame 任務完成", progress=1.0, state=states.SUCCESS)
    return {
        "config_path": request.config_path,
        "strategy_path": request.strategy_path,
        "run_once": request.run_once,
    }

