"""Celery 任務：回測"""
from __future__ import annotations

from ..celery_app import celery_app
from ..schemas.backtest import BacktestRequest
from ..services.backtest import BacktestService


@celery_app.task(name="backend.app.tasks.backtest.run")
def run_backtest_task(payload: dict) -> dict:
    request = BacktestRequest(**payload)
    service = BacktestService()
    response = service.run_backtest(request)
    try:
        return response.model_dump()
    except AttributeError:  # 兼容 Pydantic v1
        return response.dict()
