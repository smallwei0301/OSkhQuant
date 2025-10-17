# Lazybacktest 環境變數與儲存策略

為支援每日 1 萬瀏覽、6 千活躍使用者的高併發需求，我們採取 Netlify + Serverless 架構，並搭配雲端資料庫。以下整理前後端所需的設定、密鑰管理與持久化方案。

## 1. 環境變數治理

### Netlify UI / `netlify.toml`
- 於 Netlify 專案設定中建立下列變數：
  - `LAZYBACKTEST_API_PREFIX`：FastAPI 路由前綴，預設 `/api`。
  - `LAZYBACKTEST_NETLIFY_FUNCTION_NAME`：Serverless Function 名稱，例如 `api`。
  - `LAZYBACKTEST_DATABASE_URL`：指向雲端 PostgreSQL／PlanetScale MySQL 連線字串。
  - `LAZYBACKTEST_XTQUANT_ENABLED`：若需啟用 xtquant 則設為 `true`，預設為 `false`。
  - `NEXT_PUBLIC_API_BASE_URL`：前端公開 API 位址，通常為 `/.netlify/functions/api`。
  - `NEXT_PUBLIC_APP_ENV`：顯示於 UI 的環境標籤，如 `production`、`staging`。
- 建議以 Netlify Deploy Context (production / preview / deploy-preview) 區分不同值。

### 檔案管理
- `web/.env.example` 提供開發者參考，勿直接存放密鑰。
- `api/.env` 僅於本地開發使用，正式部署透過 Netlify UI 注入。
- 使用 [Netlify secrets CLI](https://docs.netlify.com/cli/get-started/#environment-variables) 可在 CI/CD 中安全注入。

## 2. 密鑰管理
- 敏感資訊 (資料庫密碼、第三方 API key) 僅存於 Netlify environment variables。
- 若需本地測試，建議使用 `doppler` 或 `direnv` 等工具加密管理。
- 針對部署審計，可將變數變更記錄於 Notion 或 Git 管理的 `ops/changelog.md`。

## 3. 持久化儲存策略

| 模組 | 需求 | 推薦方案 |
| ---- | ---- | ---- |
| 使用者登入 / 交易紀錄 | 長期保存、可查詢 | Supabase PostgreSQL 或 Planetscale MySQL，使用 Prisma/SQLAlchemy 管理 schema |
| 回測結果 / 報表 | 中長期保存、需快取 | 以資料庫為主，搭配 Netlify Edge Functions + CDN 快取，或導入 Upstash Redis 做短期快取 |
| 大型檔案 (CSV, 圖表) | 靜態下載 | Netlify Large Media 或 AWS S3 + CloudFront |

## 4. 備援與安全性
- 啟用 Netlify 的 Branch Deploy 作為 staging，測試無誤再升級 production。
- 透過雲端資料庫提供自動備份，設定每日 snapshot。
- 所有環境變數須啟用最小權限，使用專屬的 DB 使用者與 API Token。

## 5. 部署流程建議
1. 開發者於本地以 `pnpm dev` 與 `uvicorn app.main:app` 同步測試。
2. Commit 後透過 GitHub Actions 進行 Lint / 單元測試 (未連網即可執行)。
3. Netlify 於 build 時以 `netlify/functions` 建立 Python Function，載入 `api/netlify_handler.py`。
4. 前端透過 `NEXT_PUBLIC_API_BASE_URL` 指向 `/.netlify/functions/api`，跨網域問題由 Netlify 代理解決。

> 提醒：遵循 Least Privilege 原則，僅於需要時載入 xtquant，並透過 Feature Flag 控制。
