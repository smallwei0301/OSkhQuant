from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="健康檢查")
def health_check():
    return {"status": "healthy"}
