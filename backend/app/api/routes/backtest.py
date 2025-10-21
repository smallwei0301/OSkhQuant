"""回測相關 API"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from ...schemas.backtest import BacktestRequest, BacktestResponse
from ...services.backtest import BacktestService

router = APIRouter(prefix="/backtests", tags=["backtests"])
LOGGER = logging.getLogger("lazybacktest.backend.api")
SERVICE = BacktestService()


@router.post("", response_model=BacktestResponse)
def trigger_backtest(request: BacktestRequest) -> BacktestResponse:
    try:
        return SERVICE.run_backtest(request)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - 捕捉未知錯誤
        LOGGER.exception("回測任務執行失敗")
        raise HTTPException(status_code=500, detail="回測任務執行失敗") from exc
