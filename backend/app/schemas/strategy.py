"""策略相關 schema。"""
from typing import Dict, Optional

from pydantic import BaseModel, Field

from .common import TimestampedModel


class StrategyBase(BaseModel):
    """策略共用欄位。"""

    name: str = Field(..., description="策略名稱")
    description: Optional[str] = Field(None, description="策略描述")
    parameters: Dict[str, float] = Field(default_factory=dict, description="策略參數")


class StrategyCreate(StrategyBase):
    """建立策略時使用的 schema。"""

    pass


class StrategyUpdate(BaseModel):
    """更新策略時使用的 schema。"""

    name: Optional[str] = Field(None, description="策略名稱")
    description: Optional[str] = Field(None, description="策略描述")
    parameters: Optional[Dict[str, float]] = Field(None, description="策略參數")


class StrategyInDBBase(TimestampedModel):
    """資料庫中策略欄位。"""

    id: int
    name: str
    description: Optional[str]
    parameters: Dict[str, float]


class Strategy(StrategyInDBBase):
    """回傳給前端的策略資料。"""

    pass
