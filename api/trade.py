"""Trading related API helpers."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

from khQTTools import generate_signal
from khTrade import KhTradeManager

from .schemas import (
    TradeCostRequest,
    TradeCostResponse,
    TradeSignalRequest,
    TradeSignalResponse,
)


def _load_trade_config(config_path: Optional[str]) -> Dict[str, Any]:
    if not config_path:
        return {}
    path = Path(config_path).expanduser()
    if not path.exists():
        raise FileNotFoundError(f"找不到設定檔: {config_path}")
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _build_trade_manager(request: TradeCostRequest) -> KhTradeManager:
    config_dict = _load_trade_config(request.config_path)
    if request.trade_cost:
        config_dict.setdefault("backtest", {})
        config_dict["backtest"]["trade_cost"] = {
            key: value
            for key, value in request.trade_cost.dict(exclude_none=True).items()
        }

    if not config_dict:
        config_dict = {"backtest": {"trade_cost": {}}}

    config_obj = type("InlineConfig", (), {"config_dict": config_dict})
    return KhTradeManager(config_obj)  # type: ignore[arg-type]


def calculate_trade_cost_api(request: TradeCostRequest) -> TradeCostResponse:
    manager = _build_trade_manager(request)
    actual_price, total_cost = manager.calculate_trade_cost(
        price=request.price,
        volume=request.volume,
        direction=request.direction,
        stock_code=request.stock_code,
    )
    return TradeCostResponse(actual_price=actual_price, total_cost=total_cost)


def generate_trade_signal_api(request: TradeSignalRequest) -> TradeSignalResponse:
    signals = generate_signal(
        data=request.data,
        stock_code=request.stock_code,
        price=request.price,
        ratio=request.ratio,
        action=request.action,
        reason=request.reason or "",
    )
    return TradeSignalResponse(signals=signals)
