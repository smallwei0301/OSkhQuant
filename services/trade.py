"""Stateless wrappers around khTrade for serverless execution."""

from dataclasses import dataclass
from types import SimpleNamespace

from khTrade import KhTradeManager
from models.trade import TradeCostRequest, TradeCostResponse, TradeCostBreakdown


@dataclass
class TradeConfig:
    min_commission: float
    commission_rate: float
    stamp_tax_rate: float
    flow_fee: float
    slippage: dict

    def to_namespace(self) -> SimpleNamespace:
        config_dict = {
            "backtest": {
                "trade_cost": {
                    "min_commission": self.min_commission,
                    "commission_rate": self.commission_rate,
                    "stamp_tax_rate": self.stamp_tax_rate,
                    "flow_fee": self.flow_fee,
                    "slippage": self.slippage,
                }
            }
        }
        return SimpleNamespace(config_dict=config_dict)


def build_trade_manager(cost_request: TradeCostRequest) -> KhTradeManager:
    profile = cost_request.cost_profile
    slippage = {
        "type": profile.slippage.type.value,
        "ratio": profile.slippage.ratio,
        "tick_size": profile.slippage.tick_size,
        "tick_count": profile.slippage.tick_count,
    }
    config = TradeConfig(
        min_commission=profile.min_commission,
        commission_rate=profile.commission_rate,
        stamp_tax_rate=profile.stamp_tax_rate,
        flow_fee=profile.flow_fee,
        slippage=slippage,
    )
    return KhTradeManager(config=config.to_namespace())


def calculate_trade_cost(cost_request: TradeCostRequest) -> TradeCostResponse:
    manager = build_trade_manager(cost_request)
    actual_price = manager.calculate_slippage(cost_request.price, cost_request.direction)
    commission = manager.calculate_commission(actual_price, cost_request.volume)
    stamp_tax = manager.calculate_stamp_tax(actual_price, cost_request.volume, cost_request.direction)
    transfer_fee = manager.calculate_transfer_fee(cost_request.stock_code, actual_price, cost_request.volume)
    flow_fee = manager.calculate_flow_fee()
    total_cost = commission + stamp_tax + transfer_fee + flow_fee

    breakdown = TradeCostBreakdown(
        commission=commission,
        stamp_tax=stamp_tax,
        transfer_fee=transfer_fee,
        flow_fee=flow_fee,
        slippage_price=actual_price,
    )

    return TradeCostResponse(
        actual_price=actual_price,
        total_cost=total_cost,
        breakdown=breakdown,
    )
