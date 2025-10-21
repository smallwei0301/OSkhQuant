"""FastAPI application entrypoint for Lazybacktest."""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional

from celery.result import AsyncResult
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

from .auth import secured_dependency
from .backtest import BacktestTaskManager
from .schemas import (
    BacktestRunRequest,
    BacktestTaskStatus,
    DataDownloadRequest,
    KhFrameTaskRequest,
    ScheduleJobRequest,
    ScheduleJobResponse,
    SupplementHistoryRequest,
    TaskLogEntry,
    TaskStatusResponse,
    TaskSubmissionResponse,
    DataHistoryRequest,
    DataHistoryResponse,
    TradeCostRequest,
    TradeCostResponse,
    TradeSignalRequest,
    TradeSignalResponse,
)
from .trade import calculate_trade_cost_api, generate_trade_signal_api
from .history import fetch_history_data
from .celery_app import celery_app
from .scheduler import task_scheduler
from .tasks import download_data_task, khframe_pipeline_task, supplement_history_task

API_VERSION = "api_v20240518_03"
LOGGER = logging.getLogger("lazybacktest.api")

app = FastAPI(
    title="Lazybacktest API",
    description="提供資料下載、回測觸發與交易成本估算的後端服務",
    version=API_VERSION,
)


def _configure_cors(application: FastAPI) -> None:
    """Configure CORS policy based on environment variables."""
    origin_regex = os.getenv(
        "ALLOWED_ORIGIN_REGEX",
        r"https://.*\.netlify\.app|https://app\.netlify\.com",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origin_regex=origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )


_configure_cors(app)
_task_manager = BacktestTaskManager()


@app.get("/health", summary="健康檢查")
def health_check() -> Dict[str, str]:
    return {"status": "ok", "version": API_VERSION}


@app.post(
    "/data/download",
    response_model=TaskSubmissionResponse,
    dependencies=[Depends(secured_dependency)],
    summary="建立行情下載背景任務",
)
def download_data(request: DataDownloadRequest) -> TaskSubmissionResponse:
    task = download_data_task.delay(request.dict())
    return TaskSubmissionResponse(task_id=task.id, state="PENDING", detail="任務已送出")


@app.post(
    "/data/supplement",
    response_model=TaskSubmissionResponse,
    dependencies=[Depends(secured_dependency)],
    summary="補充歷史行情資料",
)
def supplement_history(request: SupplementHistoryRequest) -> TaskSubmissionResponse:
    task = supplement_history_task.delay(request.dict())
    return TaskSubmissionResponse(task_id=task.id, state="PENDING", detail="任務已送出")


@app.post(
    "/data/history",
    response_model=DataHistoryResponse,
    dependencies=[Depends(secured_dependency)],
    summary="取得歷史行情資料",
)
def get_history(request: DataHistoryRequest) -> DataHistoryResponse:
    data = fetch_history_data(request)
    return DataHistoryResponse(data=data)


@app.post(
    "/backtest/run",
    response_model=BacktestTaskStatus,
    dependencies=[Depends(secured_dependency)],
    summary="啟動回測背景任務",
)
def run_backtest(request: BacktestRunRequest) -> BacktestTaskStatus:
    try:
        status_obj = _task_manager.submit(request)
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return status_obj


@app.get(
    "/backtest/status/{task_id}",
    response_model=BacktestTaskStatus,
    dependencies=[Depends(secured_dependency)],
    summary="查詢回測任務狀態",
)
def get_backtest_status(task_id: str) -> BacktestTaskStatus:
    try:
        return _task_manager.get(task_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到對應任務") from exc


@app.post(
    "/khframe/run",
    response_model=TaskSubmissionResponse,
    dependencies=[Depends(secured_dependency)],
    summary="啟動 KhFrame 流程背景任務",
)
def run_khframe_task(request: KhFrameTaskRequest) -> TaskSubmissionResponse:
    task = khframe_pipeline_task.delay(request.dict())
    return TaskSubmissionResponse(task_id=task.id, state="PENDING", detail="任務已送出")


@app.get(
    "/tasks/{task_id}",
    response_model=TaskStatusResponse,
    dependencies=[Depends(secured_dependency)],
    summary="查詢任務進度與最新訊息",
)
def get_task(task_id: str) -> TaskStatusResponse:
    result = AsyncResult(task_id, app=celery_app)
    if result is None or result.id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到對應任務")
    return _build_task_status_response(result)


@app.websocket("/ws/tasks/{task_id}")
async def task_status_ws(websocket: WebSocket, task_id: str) -> None:
    await websocket.accept()
    try:
        last_payload = None
        while True:
            result = AsyncResult(task_id, app=celery_app)
            if result is None or result.id is None:
                await websocket.send_json({"detail": "任務不存在", "task_id": task_id})
                break
            status_obj = _build_task_status_response(result)
            payload = jsonable_encoder(status_obj)
            if payload != last_payload:
                await websocket.send_json(payload)
                last_payload = payload
            if status_obj.state in {"SUCCESS", "FAILURE"}:
                break
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        LOGGER.info("WebSocket disconnected for task %s", task_id)


@app.post(
    "/tasks/schedule",
    response_model=ScheduleJobResponse,
    dependencies=[Depends(secured_dependency)],
    summary="新增或更新排程任務",
)
def schedule_task(request: ScheduleJobRequest) -> ScheduleJobResponse:
    return task_scheduler.add_or_update_job(request)


@app.get(
    "/tasks/schedule",
    response_model=List[ScheduleJobResponse],
    dependencies=[Depends(secured_dependency)],
    summary="列出所有排程任務",
)
def list_schedules() -> List[ScheduleJobResponse]:
    return task_scheduler.list_jobs()


@app.delete(
    "/tasks/schedule/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(secured_dependency)],
    summary="刪除排程任務",
)
def delete_schedule(job_id: str) -> None:
    task_scheduler.remove_job(job_id)


@app.post(
    "/trade/cost",
    response_model=TradeCostResponse,
    dependencies=[Depends(secured_dependency)],
    summary="估算單筆交易成本",
)
def calculate_trade_cost(request: TradeCostRequest) -> TradeCostResponse:
    return calculate_trade_cost_api(request)


@app.post(
    "/trade/signal",
    response_model=TradeSignalResponse,
    dependencies=[Depends(secured_dependency)],
    summary="生成標準交易信號",
)
def create_trade_signal(request: TradeSignalRequest) -> TradeSignalResponse:
    return generate_trade_signal_api(request)


@app.exception_handler(Exception)
async def global_exception_handler(exc: Exception) -> JSONResponse:
    LOGGER.exception("Unhandled API exception", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "伺服器內部錯誤", "error": str(exc)},
    )


@app.on_event("startup")
async def _on_startup() -> None:
    await task_scheduler.start()


@app.on_event("shutdown")
async def _on_shutdown() -> None:
    await task_scheduler.shutdown()


def _parse_datetime(value: object) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _build_task_status_response(result: AsyncResult) -> TaskStatusResponse:
    meta = result.info if isinstance(result.info, dict) else {}
    state = result.state or "PENDING"

    logs: List[TaskLogEntry] = []
    for entry in meta.get("logs", []):
        if not isinstance(entry, dict):
            continue
        timestamp = _parse_datetime(entry.get("timestamp")) or datetime.utcnow()
        level = entry.get("level", "INFO")
        try:
            log_item = TaskLogEntry(timestamp=timestamp, message=str(entry.get("message", "")), level=level)
        except ValueError:
            log_item = TaskLogEntry(timestamp=timestamp, message=str(entry.get("message", "")), level="INFO")
        logs.append(log_item)

    result_payload = meta.get("result") if isinstance(meta, dict) else None
    if result_payload is None and state == "SUCCESS" and isinstance(result.result, dict):
        result_payload = result.result

    return TaskStatusResponse(
        task_id=result.id or "",
        state=state,
        status=meta.get("status") if isinstance(meta, dict) else None,
        detail=meta.get("detail") if isinstance(meta, dict) else None,
        progress=meta.get("progress") if isinstance(meta, dict) else None,
        logs=logs,
        result=result_payload if isinstance(result_payload, dict) else None,
        started_at=_parse_datetime(meta.get("started_at")) if isinstance(meta, dict) else None,
        finished_at=_parse_datetime(meta.get("finished_at")) if isinstance(meta, dict) else None,
    )
