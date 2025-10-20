"""Celery 初始化。"""
from celery import Celery

from app.core.config import get_settings

_settings = get_settings()

celery_app = Celery(
    "lazybacktest",
    broker=_settings.redis_url,
    backend=_settings.redis_url,
)
celery_app.conf.update(
    task_default_queue="lazybacktest.backtests",
    task_routes={"app.tasks.backtest.run_backtest": {"queue": "lazybacktest.backtests"}},
    worker_prefetch_multiplier=1,
)
