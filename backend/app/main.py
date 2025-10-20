"""FastAPI 進入點。"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.v1.router import api_router

settings = get_settings()
app = FastAPI(title=settings.project_name, version=settings.version_code)

if settings.backend_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.backend_cors_origins],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """提供健康檢查端點。"""

    return {"status": "ok", "version": settings.version_code}


app.include_router(api_router, prefix=settings.api_v1_prefix)
