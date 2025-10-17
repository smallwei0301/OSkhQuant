# Lazybacktest Debug Log

## LBK-NETLIFY-V8
- 建立時間：2025-10-17T02:10:01+00:00（UTC）
- 問題描述：使用者在前端按下「下載並加入資料集」時，遇到「台灣證交所服務回傳格式異常」訊息。
- 追蹤措施：
  - 前端 Netlify Functions 呼叫流程新增 BOM 清理與空白回應檢查，避免非 JSON 內容造成解析失敗。
  - `twse-daily` 函式包覆全域例外處理，產生 `twse-daily-<timestamp>` 錯誤代碼並回傳 JSON，方便使用者回報。
  - `twse-companies` 同步沿用函式錯誤代碼策略，並建議於 Console 查閱細部 Log。
- 目前狀態：已修正並持續監控，如仍遇錯誤請回報錯誤代碼。

## LBK-NETLIFY-V9
- 建立時間：2025-10-17T02:45:00+00:00（UTC）
- 問題描述：按下「下載並加入資料集」仍收到「台灣證交所服務暫時無法使用（HTTP 404）」訊息。
- 追蹤措施：
  - `twse-daily` 函式在無資料時改以 200 回應並回傳結構化錯誤訊息，避免 Netlify 將 404 解讀為服務異常。
  - 前端 `fetchTwseDailySeries` 優先檢查函式回傳的 `error` 欄位，將情境化訊息顯示給使用者。
- 目前狀態：已修正並觀察中，如仍遇 404 訊息請回報操作流程。

## LBK-NETLIFY-V10
- 建立時間：2025-10-17T03:15:00+00:00（UTC）
- 問題描述：Netlify 部署仍回報「台灣證交所服務暫時無法使用（HTTP 404）」，判斷為 Functions 未正確打包。
- 追蹤措施：
  - 調整 `netlify.toml` 將建置命令改為於根目錄執行 `cd web-app && npm run build`，同時指定 `web-app/dist` 為發布目錄，以確保 Functions 目錄以 repo 根目錄為基準。
  - 重新確認 `/.netlify/functions/twse-daily` 與 `/.netlify/functions/twse-companies` 於本地 `netlify dev` 正常回應，避免上線後出現 404。
- 目前狀態：待使用者部署驗證，如仍遇到錯誤請附上 Netlify Deploy Log。
