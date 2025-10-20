"""核心設定模組。"""
from functools import lru_cache
from typing import List

from pydantic import AnyHttpUrl, BaseSettings, Field


class Settings(BaseSettings):
    """FastAPI/Celery 全域設定。"""

    project_name: str = Field("Lazybacktest Service", env="APP_PROJECT_NAME")
    version_code: str = Field("LB-ARCH-0001", env="APP_VERSION_CODE")
    api_v1_prefix: str = Field("/api/v1", env="APP_API_V1_PREFIX")
    backend_cors_origins: List[AnyHttpUrl] = Field(default_factory=list, env="APP_CORS_ORIGINS")

    database_url: str = Field(..., env="APP_DATABASE_URL")
    redis_url: str = Field(..., env="APP_REDIS_URL")

    xtquant_home: str = Field("", env="XTQUANT_HOME")

    class Config:
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """取得快取設定。"""

    return Settings()
