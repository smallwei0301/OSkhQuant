"""FastAPI application entrypoint for Lazybacktest."""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Dict, List

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from khQTTools import download_and_store_data

from .auth import secured_dependency
from .backtest import BacktestTaskManager
from .schemas import (
    BacktestRunRequest,
    BacktestTaskStatus,
    DataDownloadRequest,
    DataDownloadResponse,
    DataHistoryRequest,
    DataHistoryResponse,
    TradeCostRequest,
    TradeCostResponse,
    TradeSignalRequest,
    TradeSignalResponse,
)
from .trade import calculate_trade_cost_api, generate_trade_signal_api
from .history import fetch_history_data

API_VERSION = "api_v20240518_01"
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
    response_model=DataDownloadResponse,
    dependencies=[Depends(secured_dependency)],
    summary="下載並儲存行情資料",
)
def download_data(request: DataDownloadRequest) -> DataDownloadResponse:
    """下載資料至本地路徑，回傳保存的檔案列表。"""
    saved_files: List[str] = []

    def _log(message: str) -> None:
        LOGGER.info("[data.download] %s", message)

    request_path = Path(request.local_data_path).expanduser()
    request_path.mkdir(parents=True, exist_ok=True)

    try:
        download_and_store_data(
            local_data_path=str(request_path),
            stock_files=request.stock_files,
            field_list=request.field_list,
            period_type=request.period_type,
            start_date=request.start_date,
            end_date=request.end_date,
            dividend_type=request.dividend_type,
            time_range=request.time_range,
            log_callback=_log,
        )
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    for file_path in request_path.glob("*.csv"):
        if request.period_type in file_path.name:
            saved_files.append(str(file_path))

    return DataDownloadResponse(
        message="資料下載完成",
        saved_files=sorted(saved_files),
    )


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
