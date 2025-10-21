from fastapi import APIRouter

from models.trade import TradeCostRequest, TradeCostResponse
from services.trade import calculate_trade_cost

router = APIRouter(tags=["trade"])


@router.post("/trade/cost", response_model=TradeCostResponse, summary="交易成本試算")
def trade_cost(payload: TradeCostRequest) -> TradeCostResponse:
    return calculate_trade_cost(payload)
