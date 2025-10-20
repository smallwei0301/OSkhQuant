"""xtquant 介面封裝。"""
from pathlib import Path
from typing import Dict


class XtQuantAdapter:
    """負責與 xtquant 本地 API 互動的抽象層。"""

    def __init__(self, xtquant_home: str):
        self.xtquant_home = Path(xtquant_home)
        if not self.xtquant_home.exists():
            raise RuntimeError("XTQuant 安裝路徑不存在，請確認環境設定。")

    def run_backtest(self, strategy_name: str, parameters: Dict[str, float], start_date: str, end_date: str) -> Dict[str, float]:
        """執行回測，需由實作時串接 xtquant API。"""

        raise NotImplementedError("請實作 xtquant 回測流程。")

    def fetch_market_snapshot(self, symbol: str) -> Dict[str, float]:
        """取得行情，即時功能可於前端透過 SSE/WebSocket 使用。"""

        raise NotImplementedError("請實作 xtquant 行情串接。")
