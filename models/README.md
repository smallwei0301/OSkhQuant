# Shared Models

此目錄提供 Lazybacktest 前後端共用的資料結構定義：

- `trade.py` / `risk.py`: 以 Pydantic 建立的後端資料模型，採用 camelCase alias，符合前端需求。
- `schemas/trade.json`: 手動維護的 JSON Schema，供 Next.js 透過 `json-schema-to-ts` 生成型別。
- `export_schema.py`: 若後續安裝 Pydantic，可執行 `python -m models.export_schema` 自動覆蓋 JSON Schema。

> 請在修改 Python Model 時同步更新 JSON Schema 或重新執行 `export_schema.py`，確保跨語言一致性。
