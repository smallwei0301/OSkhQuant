import type { PriceRecord } from '../types';
import { formatNumber } from '../utils/format';

interface DataPreviewProps {
  data: PriceRecord[];
}

export function DataPreview({ data }: DataPreviewProps) {
  if (data.length === 0) {
    return <p>尚未載入行情資料。</p>;
  }
  const preview = data.slice(0, 50);
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>開盤</th>
            <th>最高</th>
            <th>最低</th>
            <th>收盤</th>
            <th>成交量</th>
          </tr>
        </thead>
        <tbody>
          {preview.map((row) => (
            <tr key={row.timestamp.toISOString()}>
              <td>{row.timestamp.toISOString().slice(0, 10)}</td>
              <td>{formatNumber(row.open, 2)}</td>
              <td>{formatNumber(row.high, 2)}</td>
              <td>{formatNumber(row.low, 2)}</td>
              <td>{formatNumber(row.close, 2)}</td>
              <td>{formatNumber(row.volume, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
