"""Optional real-time metrics sink for ClickHouse or TimescaleDB."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Dict, Iterable, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine



@dataclass
class MetricsRecord:
    backtest_id: str
    timestamp: int
    payload: Dict[str, object]


_engine_cache: Dict[str, Engine] = {}


def _get_engine(url: str) -> Engine:
    if url not in _engine_cache:
        _engine_cache[url] = create_engine(url, pool_pre_ping=True, future=True)
    return _engine_cache[url]


def stream_metrics(records: Iterable[MetricsRecord]) -> None:
    url = os.getenv("REALTIME_METRICS_URL")
    if not url:
        return

    records = list(records)
    if not records:
        return

    if url.startswith("clickhouse"):
        _write_clickhouse(url, records)
    else:
        _write_sql(url, records)


def _write_clickhouse(url: str, records: Iterable[MetricsRecord]) -> None:
    try:
        import clickhouse_connect  # type: ignore
    except ImportError:
        return

    client = clickhouse_connect.get_client(url=url)
    rows = [
        (
            record.backtest_id,
            record.timestamp,
            json.dumps(record.payload, ensure_ascii=False),
        )
        for record in records
    ]
    client.insert(
        os.getenv("CLICKHOUSE_METRICS_TABLE", "lazybacktest.realtime_metrics"),
        rows,
        column_names=["backtest_id", "timestamp", "payload"],
    )


def _write_sql(url: str, records: Iterable[MetricsRecord]) -> None:
    engine = _get_engine(url)
    table = os.getenv("REALTIME_METRICS_TABLE", "realtime_metrics")
    insert_sql = text(
        """
        INSERT INTO {table} (backtest_id, event_time, payload)
        VALUES (:backtest_id, to_timestamp(:event_time), :payload::json)
        ON CONFLICT DO NOTHING
        """.format(table=table)
    )

    with engine.begin() as connection:
        for record in records:
            connection.execute(
                insert_sql,
                {
                    "backtest_id": record.backtest_id,
                    "event_time": record.timestamp,
                    "payload": json.dumps(record.payload, ensure_ascii=False),
                },
            )


def record_task_event(backtest_id: Optional[str], payload: Dict[str, object]) -> None:
    if not backtest_id:
        return
    record = MetricsRecord(backtest_id=backtest_id, timestamp=int(payload.get("timestamp", 0)), payload=payload)
    stream_metrics([record])

