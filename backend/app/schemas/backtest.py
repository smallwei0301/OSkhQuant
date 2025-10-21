"""FastAPI 請求/回應的資料模型"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class LogEntryModel(BaseModel):
    timestamp: datetime = Field(..., description="UTC 時間戳")
    level: str = Field(..., description="日誌等級")
    message: str = Field(..., description="日誌內容")


class FileDescriptor(BaseModel):
    name: str
    path: str
    exists: bool


class BacktestSummary(BaseModel):
    files: List[FileDescriptor]
    init_capital: Optional[float] = None
    final_asset: Optional[float] = None
    pnl: Optional[float] = None
    trade_count: int = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    benchmark: Optional[str] = None


class BacktestRequest(BaseModel):
    config: Dict[str, Any] = Field(..., description="對應原 .kh 配置內容")
    strategy_path: Optional[str] = Field(
        None, description="策略檔案相對於 strategies 目錄的路徑"
    )


class BacktestResponse(BaseModel):
    backtest_id: str
    backtest_directory: str
    summary: BacktestSummary
    logs: List[LogEntryModel]
