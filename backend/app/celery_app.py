"""Celery 初始化設定"""
from __future__ import annotations

import os

from celery import Celery

celery_app = Celery("lazybacktest")
celery_app.conf.broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
celery_app.conf.result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
celery_app.conf.task_routes = {
    "backend.app.tasks.backtest.*": {"queue": os.getenv("BACKTEST_QUEUE", "backtest")}
}
celery_app.conf.task_default_queue = os.getenv("BACKTEST_QUEUE", "backtest")
