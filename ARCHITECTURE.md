# Lazybacktest 全端架構導覽

本文件說明新建的 Next.js 前端 (`web/`) 與 FastAPI 後端 (`api/`)，以及共用模型 (`models/`) 與服務層 (`services/`) 的組織方式。

## 目錄結構

```
web/                # Next.js 14 + TypeScript + App Router
api/                # FastAPI 專案，支援 Netlify Functions
models/             # Pydantic 模型與 JSON Schema，提供跨語言一致性
services/           # Stateless 業務邏輯，包裝 khTrade/khRisk/khQuantImport
```

## 資料流程
1. **前端**：透過 `web/src/lib/types.ts` 匯入 `models/schemas/trade.json`，以 `json-schema-to-ts` 生成型別，確保型別安全。
2. **後端**：FastAPI 路由引入 `models/` 下的 Pydantic Model，並呼叫 `services/` 封裝的無狀態函式。
3. **共用服務**：`services/trade.py`、`services/risk.py`、`services/quant_import.py` 分別包裝既有模組，確保每次請求皆重新建構狀態，符合 Serverless 架構。

## Netlify Functions
- `api/netlify_handler.py` 透過 `mangum` 轉換 FastAPI app，部署於 Netlify Functions。
- 前端的 `NEXT_PUBLIC_API_BASE_URL` 建議設為 `/.netlify/functions/api`，由 Netlify 代理轉發。

## 測試與驗證
- `api/tests/test_services.py` 提供最小化單元測試範例。
- 建議於 CI (例如 GitHub Actions) 內執行 `pytest` 與 `pnpm lint`，確保部署品質。

若需擴充資料模型，請同時更新 `models/` 下的 Pydantic 類別與 JSON Schema，以維持前後端一致性。
