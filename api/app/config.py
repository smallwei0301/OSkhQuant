from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LAZYBACKTEST_", env_file=".env", extra="ignore")

    api_prefix: str = "/api"
    allowed_origins: list[str] = ["*"]
    netlify_function_name: str = "api"
    database_url: str | None = None
    xtquant_enabled: bool = False

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
