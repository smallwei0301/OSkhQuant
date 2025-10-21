"""健康檢查端點"""
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/healthz")
def health_check() -> dict:
    return {"status": "ok"}
