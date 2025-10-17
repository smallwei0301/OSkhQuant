# Lazybacktest 雲端回測中心

版本代碼：**LBK-NETLIFY-V5**

此資料夾為 Lazybacktest 的全功能瀏覽器版本，可直接部署至 Netlify。功能特色：

- ✅ 行情 CSV 多檔匯入與資料集管理，支援自動偵測股票代號與頻率
- ✅ 雙均線、RSI 與自訂腳本策略，完整保留 KHQuant 交易成本與資金管理參數
- ✅ 風險控管（最大回撤、單日損失、停損/停利、移動停損）與倉位快照
- ✅ 權益曲線、曝險、績效指標、交易紀錄、風險日誌一次呈現
- ✅ 排程規劃模組，模擬 Netlify Scheduled Functions 執行時程
- ✅ 串接台灣證券交易所 Open API，提供上市公司名錄、產業別篩選與即時日線下載，並支援民國／西元日期格式自動轉換
- ✅ 行動優先的響應式 UI、符合無障礙語意標記，提升手機族操作體驗

## 本地開發

```bash
cd web-app
npm install
npm run dev # 僅啟動前端（TWSE 功能需搭配 Netlify Functions）
```

> 沙盒環境可能無法連線 npm registry；請於有網路的環境安裝依賴套件。

若需與台灣證交所 Open API 互動，請安裝 [Netlify CLI](https://docs.netlify.com/cli/get-started/) 並於根目錄執行：

```bash
netlify dev
```

此指令會同時啟動 Vite 開發伺服器與 Netlify Functions Proxy，使 `/.netlify/functions/*` 端點在本地開發時可用。

## 單元測試

```bash
npm run test
```

## 建置靜態檔案

```bash
npm run build
```

## Netlify 一鍵部署

1. 於 Netlify 新增站台時選擇「Deploy with Git」。
2. 指定此儲存庫，Netlify 會讀取根目錄的 `netlify.toml`。
3. 建置命令：`npm run build`
4. 發佈目錄：`web-app/dist`
5. 部署完成後即可透過網頁操作桌面版 KHQuant 的完整功能。

> 若需使用自訂網域，請於 Netlify 後台設定 CNAME，並確認 TLS 憑證。
