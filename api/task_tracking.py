"""Helpers for tracking Celery task progress."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional


def _utcnow_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def initialize_meta(detail: str) -> Dict[str, Any]:
    return {
        "status": "PENDING",
        "detail": detail,
        "progress": 0.0,
        "logs": [],
        "updated_at": _utcnow_iso(),
    }


def append_log(meta: Dict[str, Any], message: str, level: str = "INFO") -> Dict[str, Any]:
    logs = list(meta.get("logs", []))
    logs.append({
        "timestamp": _utcnow_iso(),
        "message": message,
        "level": level,
    })
    meta["logs"] = logs
    meta["detail"] = message
    meta["updated_at"] = _utcnow_iso()
    return meta


def set_progress(meta: Dict[str, Any], progress: Optional[float]) -> Dict[str, Any]:
    if progress is not None:
        bounded = max(0.0, min(1.0, float(progress)))
        meta["progress"] = bounded
    meta["updated_at"] = _utcnow_iso()
    return meta


def set_status(meta: Dict[str, Any], status: str) -> Dict[str, Any]:
    meta["status"] = status
    meta["updated_at"] = _utcnow_iso()
    return meta


def set_result(meta: Dict[str, Any], result: Any) -> Dict[str, Any]:
    meta["result"] = result
    meta["updated_at"] = _utcnow_iso()
    return meta

