"""Celery tasks for Lazybacktest backend."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from celery import Task, states
from celery.utils.log import get_task_logger

from khQTTools import download_and_store_data, supplement_history_data

from .backtest import APIGuiLogger, BacktestRunRequest, execute_backtest
from .celery_app import celery_app
from .db import get_session, init_database
from .notifications import TaskEvent, notify_failure, notify_retry, notify_success
from .repositories import (
    attach_backtest_to_task,
    complete_backtest,
    create_backtest,
    delete_task_records,
    ensure_task_record,
    get_backtest_by_task,
    list_files_for_cleanup,
    list_tasks_for_cleanup,
    register_file,
    remove_file_records,
    update_task_meta,
)
from .realtime import record_task_event
from .schemas import (
    DataDownloadRequest,
    KhFrameTaskRequest,
    SupplementHistoryRequest,
)
from .storage import StorageClient
from .task_tracking import append_log, initialize_meta, set_progress, set_result, set_status

LOGGER = get_task_logger(__name__)
_STORAGE_CLIENT = StorageClient()


init_database()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TrackedTask(Task):
    """Celery task base class that keeps detailed progress metadata."""

    abstract = True

    def __call__(self, *args: Any, **kwargs: Any) -> Any:  # type: ignore[override]
        self._meta: Dict[str, Any] = initialize_meta("任務已建立")
        task_id = getattr(self.request, "id", None)
        payload = self._serialize_payload(args, kwargs)
        if task_id:
            with get_session() as session:
                ensure_task_record(
                    session,
                    task_id=task_id,
                    task_type=self.name or self.__class__.__name__,
                    detail="任務已建立",
                    payload=payload,
                    meta=self._meta,
                )
        return super().__call__(*args, **kwargs)

    # ------------------------------------------------------------------
    def init_meta(self, detail: str) -> Dict[str, Any]:
        meta = initialize_meta(detail)
        meta = set_status(meta, "running")
        meta["started_at"] = _utc_now().isoformat()
        self._meta = meta
        self.update_state(state=states.STARTED, meta=meta)
        self._sync_meta(meta)
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
        self._sync_meta(meta)
        return meta

    def _complete(self, message: str, result: Dict[str, Any]) -> Dict[str, Any]:
        meta = append_log(getattr(self, "_meta", initialize_meta(message)), message)
        meta = set_progress(meta, 1.0)
        meta = set_status(meta, "completed")
        meta = set_result(meta, result)
        meta["finished_at"] = _utc_now().isoformat()
        self._meta = meta
        self.update_state(state=states.SUCCESS, meta=meta)
        self._sync_meta(meta, result)
        return meta

    def fail(self, message: str) -> Dict[str, Any]:
        meta = append_log(getattr(self, "_meta", initialize_meta(message)), message, level="ERROR")
        meta = set_status(meta, "failed")
        meta["finished_at"] = _utc_now().isoformat()
        self._meta = meta
        self.update_state(state=states.FAILURE, meta=meta)
        self._sync_meta(meta)
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
        self._sync_meta(meta)
        notify_retry(TaskEvent(task_id=task_id, state=states.RETRY, message=str(exc), meta=meta))
        super().on_retry(exc, task_id, args, kwargs, einfo)

    # ------------------------------------------------------------------
    @staticmethod
    def _serialize_payload(args: Any, kwargs: Any) -> Dict[str, Any]:
        if kwargs:
            return dict(kwargs)
        if args:
            if len(args) == 1 and isinstance(args[0], dict):
                return dict(args[0])
            return {"args": list(args)}
        return {}

    def _sync_meta(self, meta: Dict[str, Any], result: Optional[Dict[str, Any]] = None) -> None:
        task_id = getattr(self.request, "id", None)
        if not task_id:
            return
        with get_session() as session:
            update_task_meta(session, task_id, meta, result)


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
        file_path
        for file_path in target_path.glob("*.csv")
        if request.period_type in file_path.name
    ]

    period_start = datetime.strptime(request.start_date, "%Y%m%d").replace(tzinfo=timezone.utc)
    period_end = datetime.strptime(request.end_date, "%Y%m%d").replace(tzinfo=timezone.utc)
    uploads: List[Dict[str, Any]] = []
    task_id = getattr(self.request, "id", None)

    with get_session() as session:
        for file_path in sorted(saved_files):
            try:
                uploaded = _STORAGE_CLIENT.upload(
                    file_path,
                    prefix=f"downloads/{request.period_type}",
                )
                storage_key = uploaded.storage_key
                storage_url = uploaded.url
            except Exception as exc:  # pylint: disable=broad-except
                LOGGER.exception("Upload failed for %s", file_path)
                self.push_log(f"上傳 {file_path.name} 失敗: {exc}", level="ERROR")
                storage_key = f"local/{uuid.uuid4().hex}_{file_path.name}"
                storage_url = file_path.resolve().as_uri()

            register_file(
                session,
                task_id=task_id,
                backtest_id=None,
                user_id=None,
                file_name=file_path.name,
                file_path=str(file_path),
                storage_key=storage_key,
                storage_url=storage_url,
                period_start=period_start,
                period_end=period_end,
                metadata={
                    "period_type": request.period_type,
                    "time_range": request.time_range,
                    "dividend_type": request.dividend_type,
                    "fields": request.field_list,
                },
            )
            file_size = file_path.stat().st_size if file_path.exists() else 0
            uploads.append(
                {
                    "file_name": file_path.name,
                    "storage_key": storage_key,
                    "storage_url": storage_url,
                    "file_size": file_size,
                }
            )

    self.push_log("資料下載完成", progress=1.0, state=states.SUCCESS)
    return {
        "saved_files": sorted(str(item) for item in saved_files),
        "local_data_path": str(target_path),
        "uploads": uploads,
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

    task_id = getattr(self.request, "id", None)
    backtest_id = None
    if task_id:
        with get_session() as session:
            backtest_record = create_backtest(session, task_id=task_id, payload=request.dict())
            backtest_id = str(backtest_record.id)
            attach_backtest_to_task(session, task_id, backtest_record.id)

    logger = APIGuiLogger(callback=_callback)
    execution = execute_backtest(request, logger)
    result_path = execution.get("result_path") if isinstance(execution, dict) else str(execution)
    report_payload = execution.get("report", {}) if isinstance(execution, dict) else {}

    if task_id:
        with get_session() as session:
            record = complete_backtest(
                session,
                task_id=task_id,
                status="completed",
                detail="回測流程完成",
                result_path=result_path,
                cost_summary=report_payload.get("cost_summary", {}),
                performance_summary=report_payload.get("performance_summary", {}),
                report_payload=report_payload,
            )
            if record is not None:
                backtest_id = str(record.id)

    if backtest_id:
        record_task_event(
            backtest_id,
            {
                "timestamp": int(_utc_now().timestamp()),
                "event": "backtest_completed",
                "performance": report_payload.get("performance_summary", {}),
            },
        )

    self.push_log("回測流程完成", progress=1.0, state=states.SUCCESS)
    return {"result_path": result_path, "report": report_payload, "backtest_id": backtest_id}


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


@celery_app.task(
    name="lazybacktest.maintenance.cleanup",
    bind=True,
    base=TrackedTask,
)
def cleanup_expired_resources(self: TrackedTask, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    payload = payload or {}
    retention_days = int(payload.get("retention_days", os.getenv("TASK_RETENTION_DAYS", "7")))
    file_limit = int(payload.get("file_limit", os.getenv("CLEANUP_FILE_LIMIT", "200")))
    task_limit = int(payload.get("task_limit", os.getenv("CLEANUP_TASK_LIMIT", "200")))
    cutoff = _utc_now() - timedelta(days=retention_days)

    self.init_meta("開始清理過期資源")

    removed_files = 0
    removed_tasks = 0

    with get_session() as session:
        file_records = list_files_for_cleanup(session, older_than=cutoff, limit=file_limit)
        for record in file_records:
            try:
                _STORAGE_CLIENT.delete(record.storage_key)
            except Exception as exc:  # pylint: disable=broad-except
                self.push_log(f"移除儲存物件失敗 {record.storage_key}: {exc}", level="WARNING")
            if record.file_path and os.path.exists(record.file_path):
                try:
                    Path(record.file_path).unlink()
                except FileNotFoundError:
                    pass
                except OSError as exc:  # pylint: disable=broad-except
                    self.push_log(f"刪除本地檔案失敗 {record.file_path}: {exc}", level="WARNING")
            removed_files += 1
        remove_file_records(session, file_records)

        task_records = list_tasks_for_cleanup(session, older_than=cutoff, limit=task_limit)
        removed_tasks = len(task_records)
        delete_task_records(session, task_records)

    summary = f"清理 {removed_files} 筆檔案、{removed_tasks} 筆任務"
    self.push_log(summary, progress=1.0, state=states.SUCCESS)
    return {
        "removed_files": removed_files,
        "removed_tasks": removed_tasks,
        "cutoff": cutoff.isoformat(),
        "retention_days": retention_days,
    }

