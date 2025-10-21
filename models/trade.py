from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict, model_validator


class SlippageType(str, Enum):
    ratio = "ratio"
    tick = "tick"


class SlippageConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: SlippageType = Field(default=SlippageType.ratio, description="滑點計算模式")
    ratio: float | None = Field(default=None, ge=0, description="滑點比例，ratio 模式必填")
    tick_size: float | None = Field(
        default=None, ge=0, alias="tickSize", description="tick 模式的最小跳動價格"
    )
    tick_count: int | None = Field(
        default=None, ge=0, alias="tickCount", description="tick 模式的跳動次數"
    )

    @model_validator(mode="after")
    def validate_required_fields(self):
        if self.type == SlippageType.ratio and self.ratio is None:
            raise ValueError("ratio 模式需要設定 ratio")
        if self.type == SlippageType.tick:
            if self.tick_size is None or self.tick_count is None:
                raise ValueError("tick 模式需要設定 tickSize 與 tickCount")
        return self


class CostProfile(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    min_commission: float = Field(default=5.0, ge=0, alias="minCommission")
    commission_rate: float = Field(default=0.0003, ge=0, alias="commissionRate")
    stamp_tax_rate: float = Field(default=0.001, ge=0, alias="stampTaxRate")
    flow_fee: float = Field(default=0.1, ge=0, alias="flowFee")
    slippage: SlippageConfig = Field(default_factory=SlippageConfig)


class TradeCostRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    stock_code: str = Field(alias="stockCode", description="股票代碼")
    direction: Literal["buy", "sell"]
    price: float = Field(ge=0)
    volume: int = Field(ge=0)
    cost_profile: CostProfile = Field(default_factory=CostProfile, alias="costProfile")


class TradeCostBreakdown(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    commission: float
    stamp_tax: float = Field(alias="stampTax")
    transfer_fee: float = Field(alias="transferFee")
    flow_fee: float = Field(alias="flowFee")
    slippage_price: float = Field(alias="slippagePrice")


class TradeCostResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    actual_price: float = Field(alias="actualPrice")
    total_cost: float = Field(alias="totalCost")
    breakdown: TradeCostBreakdown


class TradeSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    strategy_id: str = Field(alias="strategyId")
    timestamp: str
    trades: int
    realized_pnl: float = Field(alias="realizedPnl")
    unrealized_pnl: float = Field(alias="unrealizedPnl")
    warnings: list[str] = Field(default_factory=list)


__all__ = [
    "SlippageType",
    "SlippageConfig",
    "CostProfile",
    "TradeCostRequest",
    "TradeCostResponse",
    "TradeCostBreakdown",
    "TradeSummary",
]
