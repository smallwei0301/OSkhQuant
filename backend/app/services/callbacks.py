"""后端运行环境下的 GUI 兼容层"""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, List, Optional


class SignalEmitter:
    """简单的信号发射器，用于兼容 PyQt 的 emit 语义"""

    def __init__(self) -> None:
        self._subscribers: List[Callable] = []
        self._lock = threading.Lock()

    def connect(self, callback: Callable) -> None:
        with self._lock:
            if callback not in self._subscribers:
                self._subscribers.append(callback)

    def emit(self, *args, **kwargs) -> None:
        with self._lock:
            subscribers = list(self._subscribers)
        for callback in subscribers:
            try:
                callback(*args, **kwargs)
            except Exception:  # pragma: no cover - 日志捕捉即可
                logging.getLogger(__name__).exception("信号处理函數执行失败")


@dataclass
class LogEntry:
    """记录回测期间的日志信息"""

    timestamp: datetime
    level: str
    message: str

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "level": self.level,
            "message": self.message,
        }


class BackendGUIAdapter:
    """提供与桌面 GUI 相容的接口，便于复用原有框架日志與进度更新"""

    def __init__(self, logger: Optional[logging.Logger] = None) -> None:
        self.logger = logger or logging.getLogger("lazybacktest.backend.gui")
        self.progress_signal = SignalEmitter()
        self._backtest_result_callbacks: List[Callable[[str], None]] = []
        self._logs: List[LogEntry] = []
        self.last_backtest_dir: Optional[str] = None

    # -- GUI 兼容接口 -----------------------------------------------------
    def log_message(self, message: str, level: str = "INFO") -> None:
        level_upper = level.upper()
        log_method = getattr(self.logger, level_lower(level_upper), self.logger.info)
        log_method(message)
        self._logs.append(LogEntry(datetime.utcnow(), level_upper, message))

    def on_strategy_finished(self) -> None:
        self.logger.debug("策略执行完成通知已接收")

    def show_backtest_result(self, backtest_dir: str) -> None:
        self.last_backtest_dir = backtest_dir
        for callback in list(self._backtest_result_callbacks):
            try:
                callback(backtest_dir)
            except Exception:  # pragma: no cover
                self.logger.exception("通知回测结果路径时发生异常")

    def invoke(self, func: Callable) -> None:
        """兼容 khFrame 中通过 invoke 调用的函数"""
        func()

    # -- 事件订阅 ---------------------------------------------------------
    def connect_backtest_result(self, callback: Callable[[str], None]) -> None:
        if callable(callback):
            self._backtest_result_callbacks.append(callback)

    # -- 工具方法 ---------------------------------------------------------
    def get_logs(self) -> List[dict]:
        return [entry.to_dict() for entry in self._logs]


class BackendTraderCallback:
    """提供最小化实现，使 khFrame 能在無 GUI 環境中運行"""

    def __init__(self, gui_adapter: BackendGUIAdapter) -> None:
        self.gui = gui_adapter
        self.latest_asset_snapshot: Optional[dict] = None

    def on_stock_asset(self, asset) -> None:
        """框架在资产变动时会调用该方法"""
        if asset is None:
            return
        raw = getattr(asset, "__dict__", {})
        asset_dict = dict(raw) if isinstance(raw, dict) else {}
        if not asset_dict and hasattr(asset, "_asdict"):
            asset_dict = dict(asset._asdict())
        self.latest_asset_snapshot = asset_dict
        self.gui.log_message(f"资产更新: {asset_dict}", "DEBUG")

    # 供 _dispatch_gui_call 直接调用
    def show_backtest_result(self, backtest_dir: str) -> None:
        self.gui.show_backtest_result(backtest_dir)


def level_lower(level: str) -> str:
    mapping = {
        "DEBUG": "debug",
        "INFO": "info",
        "WARNING": "warning",
        "ERROR": "error",
        "CRITICAL": "critical",
    }
    return mapping.get(level.upper(), "info")
