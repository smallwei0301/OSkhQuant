"""資料庫遷移入口，請整合 Alembic 後取代此檔案。"""
from sqlalchemy import MetaData

from app.db import engine
from app.models import BacktestTask, Strategy  # noqa: F401  # 確保模型載入
from app.models.base import Base


def create_all() -> None:
    """建立所有資料表。"""

    metadata = MetaData()
    metadata.reflect(bind=engine)
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    create_all()
