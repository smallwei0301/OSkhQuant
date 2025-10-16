# LazyBacktest Cloud Console (LBK-20240602)

本模組提供 LazyBacktest 的瀏覽器版本，所有計算均於使用者瀏覽器端完成，適合部署於 Netlify 等靜態網站平台。

## 功能總覽

- CSV 上傳與資料驗證：需含 `symbol,date,open,high,low,close,volume` 欄位，支援多股票資料集
- RSI 與雙均線策略：可調整上下界、週期與均線長度
- 資金管理：初始資金、單筆下單金額、手續費率設定
- 視覺化介面：權益曲線、交易紀錄表格、勝率與最大回撤指標
- 多語系字體支援，介面採響應式設計並符合基本無障礙標準

## 開發環境

```bash
cd web
npm install
npm run dev
```

開發伺服器預設於 `http://localhost:5173` 啟動，並將顯示實時權益曲線更新。請透過瀏覽器 Console 確認無錯誤訊息。

## 建置與部署

```bash
npm run build
```

建置結果輸出至 `web/dist`。若使用 Netlify，可直接於專案根目錄保留的 `netlify.toml` 完成部署設定：

- `base = "web"`
- `command = "npm run build"`
- `publish = "dist"`

## 版本控管

- 程式版本：`APP_VERSION = 'LBK-20240602'`
- 介面與程式碼皆以 `LBK-20240602` 註記，方便追蹤問題來源

如需進一步擴充，例如串接伺服器端回測或新增策略，只需在 `src/lib` 新增對應模組並更新 React UI。
