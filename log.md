# Lazybacktest Debug Log

## LBK-NETLIFY-V8
- 建立時間：2025-10-17T02:10:01+00:00（UTC）
- 問題描述：使用者在前端按下「下載並加入資料集」時，遇到「台灣證交所服務回傳格式異常」訊息。
- 追蹤措施：
  - 前端 Netlify Functions 呼叫流程新增 BOM 清理與空白回應檢查，避免非 JSON 內容造成解析失敗。
  - `twse-daily` 函式包覆全域例外處理，產生 `twse-daily-<timestamp>` 錯誤代碼並回傳 JSON，方便使用者回報。
  - `twse-companies` 同步沿用函式錯誤代碼策略，並建議於 Console 查閱細部 Log。
- 目前狀態：已修正並持續監控，如仍遇錯誤請回報錯誤代碼。
