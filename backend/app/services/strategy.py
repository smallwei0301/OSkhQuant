"""策略服務層。"""
from typing import List
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.strategy import Strategy as StrategyModel
from app.schemas.strategy import StrategyCreate, StrategyUpdate


class StrategyService:
    """封裝策略 CRUD 操作。"""

    def __init__(self, db: Session):
        self.db = db

    def list_strategies(self) -> List[StrategyModel]:
        return self.db.query(StrategyModel).order_by(StrategyModel.updated_at.desc()).all()

    def create_strategy(self, payload: StrategyCreate) -> StrategyModel:
        instance = StrategyModel(**payload.dict())
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def update_strategy(self, strategy_id: int, payload: StrategyUpdate) -> StrategyModel:
        instance = self.db.get(StrategyModel, strategy_id)
        if instance is None:
            raise ValueError("Strategy not found")
        update_data = payload.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(instance, key, value)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def delete_strategy(self, strategy_id: int) -> None:
        instance = self.db.get(StrategyModel, strategy_id)
        if instance is None:
            raise ValueError("Strategy not found")
        self.db.delete(instance)
        self.db.commit()

    def get_strategy(self, strategy_id: int) -> StrategyModel:
        instance = self.db.get(StrategyModel, strategy_id)
        if instance is None:
            raise ValueError("Strategy not found")
        return instance

    def link_backtest(self, strategy_id: int, backtest_id: UUID) -> None:
        """保留與回測任務連結的介面。"""

        _ = backtest_id  # 待整合 Celery 任務後實作
        if self.db.get(StrategyModel, strategy_id) is None:
            raise ValueError("Strategy not found")
