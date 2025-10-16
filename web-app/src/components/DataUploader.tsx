import { useCallback, useState } from 'react';
import { parsePriceCsv } from '../utils/csv';
import type { ParsedPriceSeries, UploadedDatasetSummary } from '../types';

interface DataUploaderProps {
  datasets: UploadedDatasetSummary[];
  onLoaded: (series: ParsedPriceSeries[]) => void;
  onRemove: (symbol: string) => void;
  onReset: () => void;
}

export function DataUploader({ datasets, onLoaded, onRemove, onReset }: DataUploaderProps) {
  const [status, setStatus] = useState<string>('等待匯入');
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) {
        return;
      }
      setStatus('解析中...');
      setError(null);
      setIsParsing(true);

      const aggregated: ParsedPriceSeries[] = [];
      for (const file of Array.from(files)) {
        try {
          const parsed = await parsePriceCsv(file);
          aggregated.push(...parsed);
        } catch (err) {
          const message = err instanceof Error ? err.message : '解析失敗，請檢查檔案格式。';
          setError(message);
        }
      }

      if (aggregated.length > 0) {
        onLoaded(aggregated);
        const symbols = aggregated.map((item) => item.symbol).join('、');
        setStatus(`已載入 ${aggregated.length} 組資料：${symbols}`);
      } else {
        setStatus('尚未成功匯入資料');
      }

      setIsParsing(false);
      event.target.value = '';
    },
    [onLoaded]
  );

  return (
    <div className="card">
      <h2>行情資料匯入</h2>
      <p className="status-banner">
        支援券商或策略平台匯出的 CSV，系統會自動辨識股票代號與頻率，所有資料僅在瀏覽器端運算。
      </p>
      <div className="input-group">
        <label htmlFor="price-file">選擇行情 CSV 檔（可多選）</label>
        <input
          id="price-file"
          type="file"
          accept=".csv"
          multiple
          onChange={handleFile}
          disabled={isParsing}
        />
        <small>
          必填欄位：日期(Date)、開盤(Open)、最高(High)、最低(Low)、收盤(Close)。系統會偵測欄位別名並支援繁體中文標題。
        </small>
      </div>
      <p>{status}</p>
      {error && <p className="error-text">{error}</p>}
      {datasets.length > 0 && (
        <div className="dataset-table">
          <div className="dataset-header">
            <span>標的</span>
            <span>資料範圍</span>
            <span>筆數</span>
            <span>頻率</span>
            <span>操作</span>
          </div>
          {datasets.map((dataset) => (
            <div className="dataset-row" key={dataset.symbol}>
              <span className="symbol">{dataset.symbol}</span>
              <span>{dataset.start} → {dataset.end}</span>
              <span>{dataset.rowCount.toLocaleString()}</span>
              <span>{dataset.frequency === 'intraday' ? '分鐘內頻' : dataset.frequency === 'daily' ? '日線' : '未知'}</span>
              <button type="button" onClick={() => onRemove(dataset.symbol)} className="link-button">
                移除
              </button>
            </div>
          ))}
          <button type="button" className="link-button danger" onClick={onReset}>
            清空全部資料
          </button>
        </div>
      )}
    </div>
  );
}
