# Lazybacktest 雲端回測中心

版本代碼：**LBK-NETLIFY-V1**

此資料夾為 Lazybacktest 的瀏覽器版本，可直接部署至 Netlify。功能特色：

- ✅ 行情 CSV 匯入，資料僅於瀏覽器端處理
- ✅ 雙均線 + RSI 篩選策略，支援手續費與資金配置參數
- ✅ 權益曲線、績效指標、交易紀錄一次呈現
- ✅ 內建官方股票清單（滬深 A 股、指數、成分股等）
- ✅ 相容台灣大量使用者需求，採響應式與無障礙設計

## 本地開發

```bash
cd web-app
npm install
npm run dev
```

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
5. 部署完成後即可透過網頁操作回測功能。

> 若需使用自訂網域，請於 Netlify 後台設定 CNAME，並確認 TLS 憑證。
