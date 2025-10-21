# Lazybacktest 前端控制台

Lazybacktest 前端是一個以 Vite + React + TypeScript 建立的單頁式應用程式，提供資料下載、任務監控、策略回測與成果視覺化功能。UI 元件整合 Ant Design 與 Chakra UI，以提升表單體驗與排版效率。

## 功能概要

- **資料下載表單**：呼叫 `/data/download` 建立任務，支援股票清單、週期、時間區間與復權方式設定，並回寫任務 ID 至任務看板。
- **任務看板**：透過輪詢與 WebSocket 監聽 `/tasks/{task_id}` 更新進度，可取消或重試任務。
- **策略回測配置**：以 RSI 參數為範例建立回測表單，支援 `.py` 與 `.kh` 策略檔上傳，送出後觸發 `/backtest/run`。
- **結果儀表板**：使用 Recharts 呈現淨值曲線與回撤，並顯示成交明細、交易訊號與成本分佈。
- **登入權限**：整合 Auth0，封裝於 `AuthGuard` 確保登入後才能操作各頁面。
- **效能優化**：透過路由 Lazy Loading、React Query 快取與 Netlify `netlify.toml` 設定資源快取策略。
- **使用者體驗監控**：透過 `web-vitals` 回傳 RUM 指標到 `VITE_RUM_ENDPOINT`。

## 環境變數

請複製 `.env.example` 為 `.env` 並設定以下參數：

| 變數名稱 | 說明 |
| --- | --- |
| `VITE_API_BASE_URL` | 後端 REST API 網域 |
| `VITE_WS_BASE_URL` | 任務進度 WebSocket 網域 |
| `VITE_AUTH0_DOMAIN` / `VITE_AUTH0_CLIENT_ID` / `VITE_AUTH0_AUDIENCE` | Auth0 登入設定 |
| `VITE_RUM_ENDPOINT` | 收集 web-vitals 指標的端點 |
| `VITE_DEV_SERVER_PORT` | 本地開發伺服器埠號，預設 5173 |

## 開發與部署

```bash
cd frontend
npm install
npm run dev
```

建置產出：

```bash
npm run build
```

- Netlify 會讀取根目錄的 `netlify.toml`，自動配置快取與 SPA 重新導向。
- `netlify.toml` 中設定 `base = "frontend"`，讓建置流程只安裝前端所需的 Node.js 套件，避免 Netlify 嘗試安裝 `requirements.txt` 內的 PyQt5 而失敗。
- `QueryClient` 預設快取 1 分鐘資料，避免重複請求，適合每日 6,000 名活躍使用者的負載。
- 建議在 Netlify 啟用壓縮與 Edge Function 快取，以縮短台灣使用者的延遲。

## 版本資訊

| 組件 | 版本代號 |
| --- | --- |
| 前端 SPA | `LB-frontend-v20240509-1` |
| Netlify 部署設定 | `LB-deploy-v20250214-1` |

## 測試建議

- `npm run lint`：檢查程式碼規範。
- `npm run build`：確認建置可成功產生 `dist/`。
- 整合後建議在本地以 `npm run dev` 搭配實際 API 服務進行 E2E 測試，並使用瀏覽器開發者工具檢查 Network 快取命中率與 RUM 回報。
