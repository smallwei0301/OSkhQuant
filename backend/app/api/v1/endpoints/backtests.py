"""回測相關路由。"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.backtest import BacktestTask
from app.schemas.backtest import BacktestCreate, BacktestResult, BacktestStatusResponse
from app.services.backtest import BacktestService
from app.tasks.backtest import run_backtest

router = APIRouter(prefix="/backtests", tags=["backtests"])


@router.post("/", response_model=BacktestStatusResponse, status_code=status.HTTP_202_ACCEPTED)
def enqueue_backtest(payload: BacktestCreate, db: Session = Depends(get_db)) -> BacktestStatusResponse:
    service = BacktestService(db)
    task = service.enqueue_backtest(payload)
    run_backtest.delay(str(task.id))
    return service.get_status(task.id)


@router.get("/{task_id}", response_model=BacktestResult)
def get_backtest(task_id: str, db: Session = Depends(get_db)) -> BacktestResult:
    uuid = UUID(task_id)
    task = db.get(BacktestTask, uuid)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backtest not found")
    return BacktestResult(
        id=str(task.id),
        status=task.status,
        start_date=task.start_date,
        end_date=task.end_date,
        metrics=task.metrics,
        log_path=task.log_path,
        result_path=task.result_path,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("/{task_id}/status", response_model=BacktestStatusResponse)
def get_status(task_id: str, db: Session = Depends(get_db)) -> BacktestStatusResponse:
    service = BacktestService(db)
    try:
        return service.get_status(UUID(task_id))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
