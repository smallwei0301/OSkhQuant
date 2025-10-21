"""API authentication helpers."""
from __future__ import annotations

import os
import secrets
from typing import Optional

from fastapi import Depends, Header, HTTPException, status


def get_expected_token() -> Optional[str]:
    """Return the API token configured for the server."""
    return os.getenv("API_TOKEN")


def verify_token(x_api_key: str = Header(..., alias="X-API-Key")) -> None:
    """Validate the client provided API key.

    The expected token is read from the ``API_TOKEN`` environment variable. The
    check uses ``secrets.compare_digest`` to avoid timing attacks.
    """
    expected_token = get_expected_token()
    if not expected_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API token is not configured on the server.",
        )

    if not secrets.compare_digest(x_api_key, expected_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API token.",
        )


def secured_dependency(_: None = Depends(verify_token)) -> None:
    """Convenience dependency that can be reused across routers."""
    return None
