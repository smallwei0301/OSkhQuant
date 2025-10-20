"""回測資料模型。"""
from sqlalchemy import Column, DateTime, Enum, ForeignKey, JSON, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.schemas.backtest import BacktestStatus

from .base import Base


class BacktestTask(Base):
    """回測任務表。"""

    id = Column(UUID(as_uuid=True), primary_key=True)
    strategy_id = Column(ForeignKey("strategy.id", ondelete="CASCADE"), nullable=False)
    parameters_override = Column(JSON, nullable=False, server_default="{}")
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(BacktestStatus), nullable=False, default=BacktestStatus.QUEUED)
    metrics = Column(JSON, nullable=False, server_default="{}")
    log_path = Column(String(length=1024), nullable=True)
    result_path = Column(String(length=1024), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    strategy = relationship("Strategy", backref="backtests")
