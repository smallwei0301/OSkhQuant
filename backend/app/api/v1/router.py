"""v1 API 路由。"""
from fastapi import APIRouter

from .endpoints import backtests, strategies

api_router = APIRouter()
api_router.include_router(strategies.router)
api_router.include_router(backtests.router)

__all__ = ["api_router"]
