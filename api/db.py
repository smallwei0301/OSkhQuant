"""Database utilities and SQLAlchemy session management."""
from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator, Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import scoped_session, sessionmaker

from .models import Base  # noqa: E402  pylint: disable=wrong-import-position

_ENGINE: Optional[Engine] = None
SessionLocal = scoped_session(sessionmaker(expire_on_commit=False))


def _build_database_url() -> str:
    default_url = "postgresql+psycopg://lazybacktest:lazybacktest@localhost:5432/lazybacktest"
    return os.getenv("DATABASE_URL", default_url)


def _create_engine() -> Engine:
    url = _build_database_url()
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    engine = create_engine(url, echo=False, pool_pre_ping=True, future=True, connect_args=connect_args)
    return engine


def init_engine() -> Engine:
    """Initialise the global SQLAlchemy engine if needed."""
    global _ENGINE  # pylint: disable=global-statement
    if _ENGINE is None:
        _ENGINE = _create_engine()
        SessionLocal.configure(bind=_ENGINE)
        Base.metadata.create_all(bind=_ENGINE)
    return _ENGINE


@contextmanager
def get_session() -> Generator:
    """Provide a transactional scope around a series of operations."""
    engine = init_engine()
    session = SessionLocal(bind=engine)
    try:
        yield session
        session.commit()
    except Exception:  # pylint: disable=broad-except
        session.rollback()
        raise
    finally:
        session.close()


def init_database() -> None:
    """Public helper used at application startup."""
    init_engine()
