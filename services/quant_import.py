"""Utility helpers around khQuantImport for stateless usage."""

from typing import Any, Dict

from khQuantImport import TimeInfo, StockDataParser


def extract_time_metadata(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    info = TimeInfo(raw_data)
    return {
        "date": info.date_str,
        "time": info.time_str,
        "datetime": info.datetime_str,
        "timestamp": info.timestamp,
    }


def get_stock_snapshot(raw_market_data: Dict[str, Any], stock_code: str) -> Dict[str, Any]:
    parser = StockDataParser(raw_market_data)
    stock = parser.get(stock_code)
    return {
        "code": stock_code,
        "payload": stock,
        "close": parser.get_price(stock_code, "close"),
        "open": parser.get_price(stock_code, "open"),
        "high": parser.get_price(stock_code, "high"),
        "low": parser.get_price(stock_code, "low"),
        "volume": parser.get_price(stock_code, "volume"),
    }


__all__ = ["extract_time_metadata", "get_stock_snapshot"]
