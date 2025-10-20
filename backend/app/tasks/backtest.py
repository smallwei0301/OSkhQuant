"""Celery 回測任務。"""
import logging
from contextlib import contextmanager
from typing import Dict
from uuid import UUID

from celery import states
from celery.exceptions import Ignore
from sqlalchemy.orm import Session

from app.adapters.xtquant import XtQuantAdapter
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.backtest import BacktestTask
from app.schemas.backtest import BacktestStatus
from app.services.backtest import BacktestService

from .celery_app import celery_app

logger = logging.getLogger(__name__)


@contextmanager
def db_session() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@celery_app.task(bind=True, name="app.tasks.backtest.run_backtest", acks_late=True)
def run_backtest(self, task_id: str) -> Dict[str, float]:
    """執行回測任務並回寫結果。"""

    settings = get_settings()
    with db_session() as session:
        service = BacktestService(session)
        task = session.get(BacktestTask, UUID(task_id))
        if task is None:
            logger.error("回測任務不存在: %s", task_id)
            self.update_state(state=states.FAILURE, meta={"reason": "task_not_found"})
            raise Ignore()
        service.update_status(UUID(task_id), BacktestStatus.RUNNING)

        adapter = XtQuantAdapter(settings.xtquant_home)
        try:
            metrics = adapter.run_backtest(
                strategy_name=task.strategy.name,
                parameters={**task.strategy.parameters, **task.parameters_override},
                start_date=task.start_date.isoformat(),
                end_date=task.end_date.isoformat(),
            )
        except Exception as exc:  # pylint: disable=broad-except
            logger.exception("回測任務失敗: %s", task_id)
            service.update_status(UUID(task_id), BacktestStatus.FAILED)
            self.update_state(state=states.FAILURE, meta={"reason": str(exc)})
            raise Ignore() from exc

        service.update_status(UUID(task_id), BacktestStatus.SUCCEEDED, metrics=metrics)
        return metrics
