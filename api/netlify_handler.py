"""Netlify Functions entry point for FastAPI app."""

from app.main import app

try:
    from mangum import Mangum  # type: ignore
except ImportError:  # pragma: no cover
    Mangum = None  # type: ignore

    def handler(event, context):  # type: ignore
        raise RuntimeError("Mangum 未安裝，請於 Netlify 環境安裝 mangum 套件。")
else:
    handler = Mangum(app)
