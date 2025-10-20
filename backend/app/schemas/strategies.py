"""策略相關的回應模型"""
from __future__ import annotations

from pydantic import BaseModel


class StrategyInfo(BaseModel):
    name: str
    filename: str
    relative_path: str
    extension: str
