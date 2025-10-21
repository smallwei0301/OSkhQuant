"""SQLAlchemy ORM models for Lazybacktest backend."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

try:  # pragma: no cover - prefer JSONB when available
    from sqlalchemy.dialects.postgresql import JSONB as JSONType
except ImportError:  # pragma: no cover
    from sqlalchemy import JSON as JSONType  # type: ignore

UUIDType = Uuid


class Base(DeclarativeBase):
    """Declarative base class for all ORM models."""


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    strategies: Mapped[list["Strategy"]] = relationship("Strategy", back_populates="owner")
    backtests: Mapped[list["Backtest"]] = relationship("Backtest", back_populates="user")
    tasks: Mapped[list["TaskRecord"]] = relationship("TaskRecord", back_populates="user")
    files: Mapped[list["FileAsset"]] = relationship("FileAsset", back_populates="user")


class Strategy(Base, TimestampMixin):
    __tablename__ = "strategies"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUIDType, ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    parameters: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict)
    file_path: Mapped[Optional[str]] = mapped_column(String(512))

    owner: Mapped[Optional["User"]] = relationship("User", back_populates="strategies")
    backtests: Mapped[list["Backtest"]] = relationship("Backtest", back_populates="strategy")


class Backtest(Base, TimestampMixin):
    __tablename__ = "backtests"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    task_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUIDType, ForeignKey("users.id"))
    strategy_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUIDType, ForeignKey("strategies.id"))
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    detail: Mapped[Optional[str]] = mapped_column(Text)
    config_path: Mapped[Optional[str]] = mapped_column(String(512))
    strategy_path: Mapped[Optional[str]] = mapped_column(String(512))
    parameters: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict)
    result_path: Mapped[Optional[str]] = mapped_column(String(512))
    cost_summary: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict)
    performance_summary: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict)
    report_payload: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="backtests")
    strategy: Mapped[Optional["Strategy"]] = relationship("Strategy", back_populates="backtests")
    task: Mapped[Optional["TaskRecord"]] = relationship("TaskRecord", back_populates="backtest", uselist=False)
    files: Mapped[list["FileAsset"]] = relationship("FileAsset", back_populates="backtest")


class TaskRecord(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    task_type: Mapped[str] = mapped_column(String(128), nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUIDType, ForeignKey("users.id"))
    backtest_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUIDType, ForeignKey("backtests.id"))
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    detail: Mapped[Optional[str]] = mapped_column(Text)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict)
    meta: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict)
    result: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="tasks")
    backtest: Mapped[Optional["Backtest"]] = relationship("Backtest", back_populates="task")
    files: Mapped[list["FileAsset"]] = relationship("FileAsset", back_populates="task")


class FileAsset(Base, TimestampMixin):
    __tablename__ = "files"
    __table_args__ = (UniqueConstraint("storage_key", name="uq_files_storage_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    task_id: Mapped[Optional[str]] = mapped_column(String(128), ForeignKey("tasks.id"))
    backtest_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUIDType, ForeignKey("backtests.id"))
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUIDType, ForeignKey("users.id"))
    file_name: Mapped[str] = mapped_column(String(512), nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(1024))
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    checksum: Mapped[Optional[str]] = mapped_column(String(128))
    period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSONType, default=dict)

    task: Mapped[Optional["TaskRecord"]] = relationship("TaskRecord", back_populates="files")
    backtest: Mapped[Optional["Backtest"]] = relationship("Backtest", back_populates="files")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="files")

