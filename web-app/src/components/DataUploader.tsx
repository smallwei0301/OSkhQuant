import { useCallback, useState } from 'react';
import { parsePriceCsv } from '../utils/csv';
import type { PriceRecord } from '../types';

interface DataUploaderProps {
  onLoaded: (records: PriceRecord[]) => void;
}

export function DataUploader({ onLoaded }: DataUploaderProps) {
  const [status, setStatus] = useState<string>('等待匯入');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rowCount, setRowCount] = useState<number>(0);

  const handleFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      setFileName(file.name);
      setStatus('解析中...');
      setError(null);
      try {
        const records = await parsePriceCsv(file);
        if (records.length === 0) {
          setStatus('檔案內容為空');
          return;
        }
        onLoaded(records);
        setRowCount(records.length);
        const start = records[0].timestamp.toISOString().slice(0, 10);
        const end = records[records.length - 1].timestamp.toISOString().slice(0, 10);
        setStatus(`已載入 ${records.length} 筆 (${start} ~ ${end})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : '解析失敗，請檢查檔案格式。';
        setError(message);
        setStatus('匯入失敗');
      }
    },
    [onLoaded]
  );

  return (
    <div className="card">
      <h2>行情資料匯入</h2>
      <p className="status-banner">
        支援 CSV 檔案，上傳後資料會在瀏覽器中本地運算，不會上傳至伺服器。
      </p>
      <div className="input-group">
        <label htmlFor="price-file">選擇行情 CSV 檔</label>
        <input id="price-file" type="file" accept=".csv" onChange={handleFile} />
        <small>
          必填欄位：Date/Datetime、Open、High、Low、Close；Volume 欄位可選。建議來源：券商匯出或 TDX
          / 同花順。
        </small>
      </div>
      {fileName && (
        <div className="badge">
          <span aria-hidden>📄</span>
          <span>{fileName}</span>
        </div>
      )}
      <p>{status}</p>
      {rowCount > 0 && <p>可於下方「資料預覽」區段檢視前 50 筆資料。</p>}
      {error && <p style={{ color: '#fca5a5' }}>{error}</p>}
    </div>
  );
}
