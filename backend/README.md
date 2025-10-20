# Lazybacktest 後端服務

**版本代碼：LB-20240611-BE01**

本資料夾提供將原始桌面回測框架（`KhQuantFramework`）抽離為 REST API 與 Celery 任務的參考實作，方便部署於雲端環境。

## 架構重點

- **FastAPI** 提供 REST 介面，包含健康檢查、策略列表、回測觸發等端點。
- **Celery + Redis** 可用於非同步排程回測任務（預設需自行佈署 Redis）。
- **BackendGUIAdapter** 重新實作 PyQt GUI 所需的 callback 與訊號，確保回測邏輯在無視窗環境下仍可執行。
- 回測結果仍輸出到既有的 `backtest_results/` 目錄，資料結構與桌面版保持一致。

## 安裝依賴

```bash
cd backend
pip install -r requirements.txt
```

## 開發與啟動

本地開發可直接以 `uvicorn` 啟動：

```bash
export PYTHONPATH=$(pwd)/..
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Celery 工作者啟動方式：

```bash
export PYTHONPATH=$(pwd)/..
celery -A app.celery_app.celery_app worker --loglevel=info
```

## API 簡介

- `GET /healthz`：健康檢查。
- `GET /strategies`：列出 `strategies/` 目錄下可用策略。
- `POST /backtests`：提交回測任務，請求體需包含完整的 `.kh` 配置內容。

## 注意事項

1. 仍需部署 xtquant 相關依賴，並確保 API 服務可存取交易行情資料。
2. 若配置使用自訂股票列表檔案，請提供絕對路徑並確認服務容器可讀取。
3. 若需與 Netlify 前端整合，可在前端以 `fetch` 或 `SSE/WebSocket` 連接至本後端服務。

歡迎依據實際佈署環境調整 Broker、結果儲存路徑或安全機制。
