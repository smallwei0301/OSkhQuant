"""Utilities for task logging and alert notifications."""
from __future__ import annotations

import json
import logging
import os
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Any, Dict, Iterable, Optional

import psycopg
import requests

LOGGER = logging.getLogger("lazybacktest.notifications")


@dataclass
class TaskEvent:
    """Persisted representation of a task lifecycle event."""

    task_id: str
    state: str
    message: str
    meta: Optional[Dict[str, Any]] = None


def _connect() -> Optional[psycopg.Connection]:
    dsn = os.getenv("TASK_LOG_DATABASE_URL")
    if not dsn:
        LOGGER.debug("TASK_LOG_DATABASE_URL not configured; skip persistence")
        return None
    try:
        return psycopg.connect(dsn, autocommit=True)
    except Exception:  # pylint: disable=broad-except
        LOGGER.exception("Failed to connect to PostgreSQL using provided DSN")
        return None


def log_task_event(event: TaskEvent) -> None:
    """Persist a task event to PostgreSQL if a DSN is configured."""

    connection = _connect()
    if connection is None:
        return

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS task_events (
                    id BIGSERIAL PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    state TEXT NOT NULL,
                    message TEXT,
                    payload JSONB,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cursor.execute(
                """
                INSERT INTO task_events (task_id, state, message, payload)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    event.task_id,
                    event.state,
                    event.message,
                    json.dumps(event.meta) if event.meta is not None else None,
                ),
            )
    except Exception:  # pylint: disable=broad-except
        LOGGER.exception("Failed to insert task event into PostgreSQL")
    finally:
        connection.close()


def _build_email_message(subject: str, body: str, recipients: Iterable[str]) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = os.getenv("SMTP_SENDER", "no-reply@lazybacktest.ai")
    message["To"] = ", ".join(recipients)
    message.set_content(body)
    return message


def send_email_notification(subject: str, body: str) -> None:
    recipients = [email.strip() for email in os.getenv("TASK_ALERT_EMAILS", "").split(",") if email.strip()]
    if not recipients:
        return

    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")

    if not host:
        LOGGER.warning("SMTP_HOST not configured; skip email notification")
        return

    message = _build_email_message(subject, body, recipients)

    try:
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            if os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}:
                smtp.starttls()
            if username and password:
                smtp.login(username, password)
            smtp.send_message(message)
    except Exception:  # pylint: disable=broad-except
        LOGGER.exception("Failed to send email notification")


def send_webhook_notification(payload: Dict[str, Any]) -> None:
    url = os.getenv("TASK_ALERT_WEBHOOK_URL")
    if not url:
        return
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
    except Exception:  # pylint: disable=broad-except
        LOGGER.exception("Failed to send webhook notification")


def notify_failure(event: TaskEvent) -> None:
    """Notify stakeholders about a failed task."""

    log_task_event(event)

    summary = f"Task {event.task_id} failed with state {event.state}: {event.message}"
    send_email_notification(f"Lazybacktest 任務失敗通知 - {event.task_id}", summary)
    send_webhook_notification(
        {
            "task_id": event.task_id,
            "state": event.state,
            "message": event.message,
            "meta": event.meta,
        }
    )


def notify_retry(event: TaskEvent) -> None:
    log_task_event(event)

    send_webhook_notification(
        {
            "task_id": event.task_id,
            "state": event.state,
            "message": event.message,
            "meta": event.meta,
            "type": "retry",
        }
    )


def notify_success(event: TaskEvent) -> None:
    log_task_event(event)

