"""策略管理 API"""
from __future__ import annotations

from fastapi import APIRouter

from ...schemas.strategies import StrategyInfo
from ...services.strategies import StrategyCatalog

router = APIRouter(prefix="/strategies", tags=["strategies"])
CATALOG = StrategyCatalog()


@router.get("", response_model=list[StrategyInfo])
def list_strategies() -> list[StrategyInfo]:
    return [StrategyInfo(**item) for item in CATALOG.list_strategies()]
