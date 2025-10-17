# Lazybacktest Web (Next.js)

此專案提供 Lazybacktest 在 Netlify 上的前端介面，採用 Next.js 14 + TypeScript + App Router 架構。

## 主要特性

- `app/` 目錄結構配合 Server Components 與並行路由。
- Tailwind CSS 與品牌色系設定，確保響應式設計。
- 從共享 `../models/schemas` 載入 JSON Schema，確保資料結構一致。
- 支援環境變數載入 (`.env.local`, `.env.production`)，透過 `NEXT_PUBLIC_` 前綴暴露必要設定。

## 開發指令

```bash
pnpm install # 建議使用 pnpm，也可使用 npm/yarn
pnpm dev      # 啟動開發伺服器
pnpm build    # 建立正式版
pnpm lint     # 執行 ESLint
```

## 環境變數

| 變數 | 說明 | 範例 |
| ---- | ---- | ---- |
| `NEXT_PUBLIC_API_BASE_URL` | 指向 FastAPI (Netlify Functions Proxy) | `/.netlify/functions/api` |
| `NEXT_PUBLIC_APP_ENV` | 顯示於 UI 的環境標籤 | `staging` |

請將實際密鑰設定於 Netlify Project 設定介面，不要 commit 到版本庫。
