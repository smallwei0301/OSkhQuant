"""回測服務層。"""
from datetime import datetime
from typing import Dict, Optional
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.backtest import BacktestTask
from app.schemas.backtest import BacktestCreate, BacktestStatus, BacktestStatusResponse


class BacktestService:
    """回測任務操作。"""

    def __init__(self, db: Session):
        self.db = db

    def enqueue_backtest(self, payload: BacktestCreate) -> BacktestTask:
        task_id = uuid4()
        task = BacktestTask(
            id=task_id,
            strategy_id=payload.strategy_id,
            parameters_override=payload.parameters_override,
            start_date=payload.start_date,
            end_date=payload.end_date,
            status=BacktestStatus.QUEUED,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update_status(
        self,
        task_id: UUID,
        status: BacktestStatus,
        metrics: Optional[Dict[str, float]] = None,
        log_path: Optional[str] = None,
        result_path: Optional[str] = None,
    ) -> BacktestTask:
        task = self.db.get(BacktestTask, task_id)
        if task is None:
            raise ValueError("Backtest task not found")
        task.status = status
        now = datetime.utcnow()
        if status == BacktestStatus.RUNNING:
            task.started_at = now
        if status in {BacktestStatus.SUCCEEDED, BacktestStatus.FAILED}:
            task.finished_at = now
        if metrics is not None:
            task.metrics = metrics
        if log_path is not None:
            task.log_path = log_path
        if result_path is not None:
            task.result_path = result_path
        self.db.commit()
        self.db.refresh(task)
        return task

    def get_status(self, task_id: UUID) -> BacktestStatusResponse:
        task = self.db.get(BacktestTask, task_id)
        if task is None:
            raise ValueError("Backtest task not found")
        return BacktestStatusResponse(task_id=str(task.id), status=task.status)
