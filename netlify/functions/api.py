"""Netlify Functions shim that exposes the FastAPI handler."""

from api.netlify_handler import handler

__all__ = ["handler"]
