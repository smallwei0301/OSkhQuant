"""Repository helpers for database persistence."""
from __future__ import annotations

import hashlib
import os
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional, Tuple

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from .models import Backtest, FileAsset, TaskRecord

ISO_FORMATS = ("%Y-%m-%d", "%Y%m%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f")


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    for fmt in ISO_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:  # pylint: disable=broad-except
        return None


def ensure_task_record(
    session: Session,
    *,
    task_id: str,
    task_type: str,
    detail: str,
    payload: Optional[Dict[str, Any]] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> TaskRecord:
    record = session.get(TaskRecord, task_id)
    if record is None:
        record = TaskRecord(id=task_id, task_type=task_type)
        session.add(record)
    record.detail = detail
    record.meta = meta or {}
    record.payload = payload or {}
    record.status = meta.get("status", "pending") if meta else "pending"
    record.progress = float(meta.get("progress", 0.0)) if meta else 0.0
    record.started_at = _parse_datetime(meta.get("started_at")) if meta else None
    session.flush()
    return record


def update_task_meta(
    session: Session,
    task_id: str,
    meta: Dict[str, Any],
    result: Optional[Dict[str, Any]] = None,
) -> Optional[TaskRecord]:
    record = session.get(TaskRecord, task_id)
    if record is None:
        return None
    record.meta = meta
    record.status = meta.get("status", record.status)
    record.progress = float(meta.get("progress", record.progress))
    record.detail = meta.get("detail", record.detail)
    record.started_at = _parse_datetime(meta.get("started_at")) or record.started_at
    record.finished_at = _parse_datetime(meta.get("finished_at")) or record.finished_at
    if record.started_at and record.finished_at:
        record.duration_seconds = (record.finished_at - record.started_at).total_seconds()
    if result:
        record.result = result
    session.flush()
    return record


def create_backtest(
    session: Session,
    *,
    task_id: str,
    payload: Dict[str, Any],
    user_id: Optional[uuid.UUID] = None,
    strategy_id: Optional[uuid.UUID] = None,
) -> Backtest:
    record = session.scalar(select(Backtest).where(Backtest.task_id == task_id))
    if record is None:
        record = Backtest(
            task_id=task_id,
            user_id=user_id,
            strategy_id=strategy_id,
            parameters=payload,
            config_path=payload.get("config_path"),
            strategy_path=payload.get("strategy_path"),
        )
        session.add(record)
        session.flush()
    else:
        record.parameters = payload
    return record


def complete_backtest(
    session: Session,
    *,
    task_id: str,
    status: str,
    detail: Optional[str],
    result_path: Optional[str],
    cost_summary: Dict[str, Any],
    performance_summary: Dict[str, Any],
    report_payload: Dict[str, Any],
) -> Optional[Backtest]:
    record = session.scalar(select(Backtest).where(Backtest.task_id == task_id))
    if record is None:
        return None
    record.status = status
    record.detail = detail
    record.result_path = result_path
    record.cost_summary = cost_summary
    record.performance_summary = performance_summary
    record.report_payload = report_payload
    session.flush()
    return record


def attach_backtest_to_task(session: Session, task_id: str, backtest_id: uuid.UUID) -> None:
    record = session.get(TaskRecord, task_id)
    if record:
        record.backtest_id = backtest_id
        session.flush()


def _build_checksum(path: str) -> str:
    hash_md5 = hashlib.md5()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def register_file(
    session: Session,
    *,
    task_id: Optional[str],
    backtest_id: Optional[uuid.UUID],
    user_id: Optional[uuid.UUID],
    file_name: str,
    file_path: str,
    storage_key: str,
    storage_url: str,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
    metadata: Optional[Dict[str, Any]] = None,
) -> FileAsset:
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    checksum = _build_checksum(file_path) if os.path.exists(file_path) else None
    record = FileAsset(
        task_id=task_id,
        backtest_id=backtest_id,
        user_id=user_id,
        file_name=file_name,
        file_path=file_path,
        storage_key=storage_key,
        storage_url=storage_url,
        file_size=file_size,
        checksum=checksum,
        period_start=period_start,
        period_end=period_end,
        metadata=metadata or {},
    )
    session.add(record)
    session.flush()
    return record


def list_files_for_cleanup(
    session: Session,
    *,
    older_than: datetime,
    limit: int,
) -> List[FileAsset]:
    stmt = (
        select(FileAsset)
        .where(FileAsset.created_at < older_than)
        .order_by(FileAsset.created_at.asc())
        .limit(limit)
    )
    return list(session.scalars(stmt))


def remove_file_records(session: Session, records: Iterable[FileAsset]) -> None:
    for record in records:
        session.delete(record)
    session.flush()


def list_tasks_for_cleanup(
    session: Session,
    *,
    older_than: datetime,
    statuses: Tuple[str, ...] = ("completed", "failed"),
    limit: int,
) -> List[TaskRecord]:
    stmt = (
        select(TaskRecord)
        .where(and_(TaskRecord.finished_at.is_not(None), TaskRecord.finished_at < older_than))
        .where(TaskRecord.status.in_(statuses))
        .order_by(TaskRecord.finished_at.asc())
        .limit(limit)
    )
    return list(session.scalars(stmt))


def delete_task_records(session: Session, records: Iterable[TaskRecord]) -> None:
    for record in records:
        session.delete(record)
    session.flush()


def get_backtest_report(session: Session, backtest_id: uuid.UUID) -> Optional[Backtest]:
    return session.get(Backtest, backtest_id)


def get_backtest_by_task(session: Session, task_id: str) -> Optional[Backtest]:
    return session.scalar(select(Backtest).where(Backtest.task_id == task_id))

