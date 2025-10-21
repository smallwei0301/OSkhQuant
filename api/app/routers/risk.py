from fastapi import APIRouter

from models.risk import RiskCheckRequest, RiskCheckResponse
from services.risk import evaluate_risk

router = APIRouter(tags=["risk"])


@router.post("/risk/check", response_model=RiskCheckResponse, summary="風控檢查")
def risk_check(payload: RiskCheckRequest) -> RiskCheckResponse:
    return evaluate_risk(payload)
