"""Lazybacktest FastAPI 入口"""
from __future__ import annotations

from fastapi import FastAPI

from .api.routes import backtest, health, strategies


def create_app() -> FastAPI:
    app = FastAPI(
        title="Lazybacktest API",
        description="將看海量化回測框架抽離成 REST 介面",
        version="0.1.0",
    )
    app.include_router(health.router)
    app.include_router(strategies.router)
    app.include_router(backtest.router)
    return app


app = create_app()
