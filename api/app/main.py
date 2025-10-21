from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import health, trade, risk

settings = get_settings()

app = FastAPI(title="Lazybacktest API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(trade.router, prefix=settings.api_prefix)
app.include_router(risk.router, prefix=settings.api_prefix)


@app.get("/")
def root():
    return {"status": "ok", "docs": f"{settings.api_prefix}/docs"}
