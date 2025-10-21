"""策略清單服務"""
from __future__ import annotations

from pathlib import Path
from typing import List

REPO_ROOT = Path(__file__).resolve().parents[3]
STRATEGY_DIR = REPO_ROOT / "strategies"


class StrategyCatalog:
    def __init__(self, base_dir: Path = STRATEGY_DIR) -> None:
        self.base_dir = base_dir

    def list_strategies(self) -> List[dict]:
        strategies: List[dict] = []
        if not self.base_dir.exists():
            return strategies

        for path in sorted(self.base_dir.glob("*")):
            if path.is_file() and path.suffix.lower() in {".py", ".kh"}:
                strategies.append(
                    {
                        "name": path.stem,
                        "filename": path.name,
                        "relative_path": str(path.relative_to(self.base_dir)),
                        "extension": path.suffix,
                    }
                )
        return strategies
