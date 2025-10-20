"""策略相關路由。"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.strategy import Strategy, StrategyCreate, StrategyUpdate
from app.services.strategy import StrategyService

router = APIRouter(prefix="/strategies", tags=["strategies"])


@router.get("/", response_model=list[Strategy])
def list_strategies(db: Session = Depends(get_db)) -> list[Strategy]:
    service = StrategyService(db)
    return service.list_strategies()


@router.post("/", response_model=Strategy, status_code=status.HTTP_201_CREATED)
def create_strategy(payload: StrategyCreate, db: Session = Depends(get_db)) -> Strategy:
    service = StrategyService(db)
    return service.create_strategy(payload)


@router.put("/{strategy_id}", response_model=Strategy)
def update_strategy(strategy_id: int, payload: StrategyUpdate, db: Session = Depends(get_db)) -> Strategy:
    service = StrategyService(db)
    try:
        return service.update_strategy(strategy_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_strategy(strategy_id: int, db: Session = Depends(get_db)) -> None:
    service = StrategyService(db)
    try:
        service.delete_strategy(strategy_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{strategy_id}", response_model=Strategy)
def get_strategy(strategy_id: int, db: Session = Depends(get_db)) -> Strategy:
    service = StrategyService(db)
    try:
        return service.get_strategy(strategy_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
