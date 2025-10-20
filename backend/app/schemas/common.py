"""共用 schema。"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TimestampedModel(BaseModel):
    """提供建立與更新時間欄位。"""

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
