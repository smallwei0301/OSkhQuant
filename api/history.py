"""Helpers for行情歷史資料查詢."""
from __future__ import annotations

from typing import Dict, List

import pandas as pd

from khQTTools import khHistory

from .schemas import DataHistoryRequest, HistoryDataPoint


def fetch_history_data(request: DataHistoryRequest) -> Dict[str, List[HistoryDataPoint]]:
    """Call khHistory and normalise結果為可序列化結構."""
    result = khHistory(
        symbol_list=request.symbol_list,
        fields=request.fields,
        bar_count=request.bar_count,
        fre_step=request.fre_step,
        current_time=request.current_time,
        skip_paused=request.skip_paused,
        fq=request.fq,
        force_download=request.force_download,
    )

    response: Dict[str, List[HistoryDataPoint]] = {}
    for code, df in result.items():
        if df is None or isinstance(df, dict) and not df:
            response[code] = []
            continue

        if not isinstance(df, pd.DataFrame):
            continue

        points: List[HistoryDataPoint] = []
        for _, row in df.iterrows():
            values = row.to_dict()
            time_value = values.pop("time", None)
            if isinstance(time_value, pd.Timestamp):
                timestamp = time_value.to_pydatetime()
            elif time_value is not None:
                try:
                    timestamp = pd.to_datetime(time_value).to_pydatetime()
                except (TypeError, ValueError):
                    continue
            else:
                continue

            points.append(
                HistoryDataPoint(
                    time=timestamp,
                    values=values,
                )
            )
        response[code] = points

    return response
