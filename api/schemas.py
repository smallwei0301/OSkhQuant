"""Pydantic models for the Lazybacktest API."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, validator


class DataDownloadRequest(BaseModel):
    local_data_path: str = Field(..., description="本地儲存資料的路徑")
    stock_files: List[str] = Field(..., description="股票代碼清單檔案路徑列表")
    field_list: List[str] = Field(..., description="要下載的欄位")
    period_type: Literal["tick", "1m", "5m", "1d"] = Field(
        ..., description="下載的K線週期"
    )
    start_date: str = Field(..., regex=r"^\d{8}$", description="開始日期 (YYYYMMDD)")
    end_date: str = Field(..., regex=r"^\d{8}$", description="結束日期 (YYYYMMDD)")
    dividend_type: Literal["none", "front", "back", "front_ratio", "back_ratio"] = (
        Field("none", description="復權類型")
    )
    time_range: str = Field(
        "all",
        description="時間區間，例如 09:30-11:30 或 all",
    )

    @validator("stock_files")
    def _validate_stock_files(cls, value: List[str]) -> List[str]:
        if not value:
            raise ValueError("stock_files 至少需要一個檔案")
        return [str(Path(item).expanduser()) for item in value]


class DataDownloadResponse(BaseModel):
    message: str
    saved_files: List[str]


class DataHistoryRequest(BaseModel):
    symbol_list: List[str] = Field(..., description="股票代碼列表")
    fields: List[str] = Field(..., description="歷史數據欄位")
    bar_count: int = Field(..., gt=0, description="取得K線數量")
    fre_step: Literal["tick", "1m", "5m", "1d"]
    current_time: Optional[str] = Field(
        None, description="基準時間，若為 None 代表使用現在"
    )
    skip_paused: bool = False
    fq: Literal["pre", "post", "none"] = "pre"
    force_download: bool = False


class HistoryDataPoint(BaseModel):
    time: datetime
    values: Dict[str, Any]


class DataHistoryResponse(BaseModel):
    data: Dict[str, List[HistoryDataPoint]]


class BacktestRunRequest(BaseModel):
    config_path: str = Field(..., description="設定檔路徑 (JSON)")
    strategy_path: str = Field(..., description="策略腳本路徑")
    fq: Literal["pre", "post", "none"] = "pre"
    fields: List[str] = Field(
        default_factory=lambda: ["open", "high", "low", "close", "volume", "amount"],
        description="回測需要的行情欄位",
    )
    bar_count: int = Field(500, description="回測初始化用的歷史資料數量", gt=0)

    @validator("config_path", "strategy_path")
    def _expand_path(cls, value: str) -> str:  # type: ignore[override]
        if not value:
            raise ValueError("路徑不可為空")
        return str(Path(value).expanduser())


class BacktestTaskStatus(BaseModel):
    task_id: str
    status: Literal["pending", "running", "completed", "failed"]
    detail: Optional[str] = None
    result_path: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None


class TradeCostConfig(BaseModel):
    min_commission: Optional[float] = Field(None, ge=0)
    commission_rate: Optional[float] = Field(None, ge=0)
    stamp_tax_rate: Optional[float] = Field(None, ge=0)
    flow_fee: Optional[float] = Field(None, ge=0)


class TradeCostRequest(BaseModel):
    price: float = Field(..., gt=0)
    volume: int = Field(..., ge=0)
    direction: Literal["buy", "sell"]
    stock_code: str
    config_path: Optional[str] = Field(
        None, description="若提供，將從設定檔載入交易成本設定"
    )
    trade_cost: Optional[TradeCostConfig] = Field(
        None, description="若未提供設定檔，可直接覆寫交易成本"
    )

    @validator("stock_code")
    def _normalize_code(cls, value: str) -> str:  # type: ignore[override]
        if not value:
            raise ValueError("stock_code 不可為空")
        return value.strip()


class TradeCostResponse(BaseModel):
    actual_price: float
    total_cost: float


class TradeSignalRequest(BaseModel):
    data: Dict[str, Any] = Field(
        ..., description="策略資料上下文，需包含 __account__ 等必要欄位"
    )
    stock_code: str
    price: float = Field(..., gt=0)
    ratio: float = Field(..., gt=0)
    action: Literal["buy", "sell"]
    reason: Optional[str] = None


class TradeSignalResponse(BaseModel):
    signals: List[Dict[str, Any]]
