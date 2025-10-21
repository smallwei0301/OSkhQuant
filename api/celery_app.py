"""Celery application factory for Lazybacktest."""
from __future__ import annotations

import os
from celery import Celery


def _default_redis_url() -> str:
    host = os.getenv("REDIS_HOST", "127.0.0.1")
    port = os.getenv("REDIS_PORT", "6379")
    db = os.getenv("REDIS_DB", "0")
    password = os.getenv("REDIS_PASSWORD")
    if password:
        return f"redis://:{password}@{host}:{port}/{db}"
    return f"redis://{host}:{port}/{db}"


def create_celery_app() -> Celery:
    """Create and configure a Celery application instance."""
    broker_url = os.getenv("CELERY_BROKER_URL", _default_redis_url())
    backend_url = os.getenv("CELERY_RESULT_BACKEND", broker_url)

    app = Celery(
        "lazybacktest",
        broker=broker_url,
        backend=backend_url,
        include=["api.tasks"],
    )

    app.conf.update(
        task_track_started=True,
        worker_send_task_events=True,
        task_send_sent_event=True,
        result_expires=int(os.getenv("CELERY_RESULT_EXPIRES", "86400")),
        timezone=os.getenv("CELERY_TIMEZONE", "Asia/Taipei"),
        enable_utc=False,
        accept_content=["json"],
        task_serializer="json",
        result_serializer="json",
    )

    return app


celery_app = create_celery_app()

