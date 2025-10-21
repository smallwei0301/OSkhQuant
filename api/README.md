# Lazybacktest API (FastAPI)

此專案將原始 `khTrade.py`、`khRisk.py`、`khQuantImport.py` 的核心邏輯模組化，並封裝成可部署於 Netlify Functions 的無狀態 FastAPI 服務。

## 架構總覽

- `app/main.py`: FastAPI 入口，配置 CORS 與路由。
- `app/routers/`: RESTful 路由，對應交易成本與風控檢核等功能。
- `services/`: 將傳統類別封裝成無狀態函式，確保 Serverless 友善。
- `models/`: 引用根目錄 `models/` 中的 Pydantic 物件，保持前後端資料結構一致。

## 本地開發

```bash
cd api
uvicorn app.main:app --reload --port 8000
```

## Netlify Functions 部署

- 專案已預先提供 `netlify/functions/api.py`，直接引入 `api/netlify_handler.py` 中的 `handler`。
- `netlify.toml` 範例：

```toml
[build]
  command = "cd web && npm install && npm run build"
  publish = "web/.next"
  functions = "netlify/functions"

[build.environment]
  PIP_REQUIREMENTS = "api/requirements.txt"
  PYTHON_VERSION = "3.10"

[functions."api"]
  included_files = ["api/**", "models/**", "services/**"]

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

- Netlify 會依照 `PIP_REQUIREMENTS` 僅安裝 `api/requirements.txt`，避免 Desktop 版依賴 (如 `xtquant`) 阻礙佈署。
- 本地或 CI 可使用 `pip install -r api/requirements.txt` 安裝 FastAPI 相關依賴。

## 環境變數

| 變數 | 說明 | 預設 |
| ---- | ---- | ---- |
| `LAZYBACKTEST_API_PREFIX` | API 前綴，對應 Next.js proxy | `/api` |
| `LAZYBACKTEST_NETLIFY_FUNCTION_NAME` | Netlify Function 名稱 | `api` |
| `LAZYBACKTEST_DATABASE_URL` | 資料庫連線字串 (可選) | `None` |
| `LAZYBACKTEST_XTQUANT_ENABLED` | 是否啟用 xtquant 相依 | `False` |

請將敏感資訊於 Netlify 後台設定，不要 commit 到版本庫。
