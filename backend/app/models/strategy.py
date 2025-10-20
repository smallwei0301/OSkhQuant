"""策略資料模型。"""
from sqlalchemy import Column, DateTime, Integer, JSON, String, func

from .base import Base


class Strategy(Base):
    """策略資料表。"""

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(length=255), nullable=False, unique=True)
    description = Column(String(length=1024), nullable=True)
    parameters = Column(JSON, nullable=False, server_default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
