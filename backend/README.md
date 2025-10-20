# Lazybacktest 雲端後端服務

版本代碼：`LB-ARCH-0001`

本目錄提供 FastAPI + Celery 後端骨架，將原本 PyQt 介面耦合的回測邏輯抽離為 REST / WebSocket 友善的雲端服務。請依照以下流程部署：

## 1. 安裝依賴

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2. 設定環境變數

複製 `.env.example` 為 `.env` 並填寫實際的 PostgreSQL、Redis 與 xtquant 安裝路徑。

## 3. 初始化資料庫

```bash
python -m app.db.migrate
```

> 提示：可使用 Alembic 建立 migration；此骨架預留 SQLAlchemy 模型供後續擴充。

## 4. 啟動服務

```bash
uvicorn app.main:app --reload
celery -A app.tasks.celery_app worker --loglevel=info
```

## 5. API 規格

- `GET /health`：健康檢查
- `GET /api/v1/strategies/`：策略列表
- `POST /api/v1/strategies/`：建立策略
- `POST /api/v1/backtests/`：建立回測任務並丟入 Celery 佇列
- `GET /api/v1/backtests/{task_id}`：查詢回測結果
- `GET /api/v1/backtests/{task_id}/status`：查詢回測狀態

## xtquant 串接

`app/adapters/xtquant.py` 定義介面，請將原本 `MiniQMT` 相關呼叫搬移至此模組，以確保後端保持單一責任與可測試性。

## 測試建議

- 為 `StrategyService` 與 `BacktestService` 撰寫 pytest 測試，確保資料庫 CRUD 正確。
- 透過 Celery 任務整合測試驗證回測流程。

部署完成後，即可供 Netlify 上的 Next.js 前端透過 `NEXT_PUBLIC_API_BASE_URL` 呼叫。
