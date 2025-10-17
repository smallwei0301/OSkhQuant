"""Utility to export Pydantic models into JSON Schema for TypeScript consumption."""

from pathlib import Path

from .trade import TradeCostRequest, TradeCostResponse, TradeSummary
from .risk import RiskCheckRequest, RiskCheckResponse

SCHEMA_PATH = Path(__file__).resolve().parent / "schemas" / "trade.json"


def generate_schema() -> None:
    schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Lazybacktest Shared Models",
        "definitions": {
            "TradeCostRequest": TradeCostRequest.model_json_schema(ref_template="#/definitions/{model}") | {
                "example": TradeCostRequest().model_dump()
            },
            "TradeCostResponse": TradeCostResponse.model_json_schema(ref_template="#/definitions/{model}"),
            "TradeSummary": TradeSummary.model_json_schema(ref_template="#/definitions/{model}") | {
                "example": TradeSummary(
                    strategy_id="demo-strategy",
                    timestamp="2024-01-01T00:00:00Z",
                    trades=0,
                    realized_pnl=0.0,
                    unrealized_pnl=0.0,
                    warnings=["尚未連線"]
                ).model_dump()
            },
            "RiskCheckRequest": RiskCheckRequest.model_json_schema(ref_template="#/definitions/{model}"),
            "RiskCheckResponse": RiskCheckResponse.model_json_schema(ref_template="#/definitions/{model}")
        }
    }

    SCHEMA_PATH.parent.mkdir(parents=True, exist_ok=True)
    SCHEMA_PATH.write_text(
        # ensure ASCII only for compatibility
        __import__("json").dumps(schema, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


if __name__ == "__main__":
    generate_schema()
