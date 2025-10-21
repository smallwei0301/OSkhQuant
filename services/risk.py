"""Risk evaluation service derived from khRisk module."""

from types import SimpleNamespace

from khRisk import KhRiskManager
from models.risk import RiskCheckRequest, RiskCheckResponse


def evaluate_risk(request: RiskCheckRequest) -> RiskCheckResponse:
    config = SimpleNamespace(
        position_limit=request.max_position,
        order_limit=request.max_orders,
        loss_limit=request.loss_limit,
    )
    manager = KhRiskManager(config)

    reasons: list[str] = []
    if request.position > manager.position_limit:
        reasons.append(
            f"持倉 {request.position} 超過上限 {manager.position_limit}"
        )
    if request.open_orders > manager.order_limit:
        reasons.append(
            f"委託筆數 {request.open_orders} 超過上限 {manager.order_limit}"
        )
    if request.floating_loss > manager.loss_limit:
        reasons.append(
            f"浮動虧損 {request.floating_loss:.2f} 超過止損 {manager.loss_limit:.2f}"
        )

    return RiskCheckResponse(passed=len(reasons) == 0, reasons=reasons)
