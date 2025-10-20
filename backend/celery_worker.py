"""Celery worker 啟動腳本。"""
from app.tasks import celery_app


def main() -> None:
    celery_app.worker_main(argv=["worker", "--loglevel=INFO"])


if __name__ == "__main__":
    main()
