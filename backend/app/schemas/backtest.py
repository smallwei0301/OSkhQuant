"""回測相關 schema。"""
from datetime import datetime
from enum import Enum
from typing import Dict, Optional

from pydantic import BaseModel, Field

from .common import TimestampedModel


class BacktestStatus(str, Enum):
    """回測任務狀態。"""

    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class BacktestBase(BaseModel):
    """回測共用欄位。"""

    strategy_id: int
    parameters_override: Dict[str, float] = Field(default_factory=dict)
    start_date: datetime
    end_date: datetime


class BacktestCreate(BacktestBase):
    """建立回測任務時使用的 schema。"""

    pass


class BacktestResult(TimestampedModel):
    """回測結果資料。"""

    id: str
    status: BacktestStatus
    start_date: datetime
    end_date: datetime
    metrics: Dict[str, float] = Field(default_factory=dict)
    log_path: Optional[str] = None
    result_path: Optional[str] = None


class BacktestStatusResponse(BaseModel):
    """回傳任務狀態。"""

    task_id: str
    status: BacktestStatus
