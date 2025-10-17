import { useEffect, useMemo, useState } from 'react';
import type { PortfolioSnapshot, PriceRecord, UploadedDatasetSummary } from '../types';
import { formatNumber } from '../utils/format';

interface DataPreviewProps {
  datasets: Record<string, PriceRecord[]>;
  summaries: UploadedDatasetSummary[];
  snapshots?: PortfolioSnapshot[];
}

const EMPTY_DATASETS: Record<string, PriceRecord[]> = {};

export function DataPreview({ datasets, summaries, snapshots }: DataPreviewProps) {
  const seriesMap = datasets ?? EMPTY_DATASETS;
  const [activeSymbol, setActiveSymbol] = useState<string>(summaries[0]?.symbol ?? '');

  useEffect(() => {
    if (!activeSymbol && summaries.length > 0) {
      setActiveSymbol(summaries[0].symbol);
    }
    if (activeSymbol && !summaries.find((item) => item.symbol === activeSymbol)) {
      setActiveSymbol(summaries[0]?.symbol ?? '');
    }
  }, [activeSymbol, summaries]);

  const currentRecords = useMemo(() => {
    if (!activeSymbol) {
      return [] as PriceRecord[];
    }
    return seriesMap[activeSymbol] ?? [];
  }, [activeSymbol, seriesMap]);

  const previewRows = useMemo(() => currentRecords.slice(-50), [currentRecords]);

  const latestSnapshot = useMemo(() => {
    if (!snapshots || snapshots.length === 0) {
      return null;
    }
    return snapshots[snapshots.length - 1];
  }, [snapshots]);

  if (summaries.length === 0) {
    return (
      <div className="card">
        <h2>資料預覽</h2>
        <p>尚未載入行情資料。</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>資料預覽</h2>
      <div className="dataset-summary-grid">
        {summaries.map((summary) => (
          <div className="dataset-card" key={summary.symbol}>
            <div className="dataset-card-header">
              <span className="symbol">{summary.symbol}</span>
              <span className="frequency">
                {summary.frequency === 'intraday' ? '分鐘內頻' : summary.frequency === 'daily' ? '日線' : '未知'}
              </span>
            </div>
            {summary.name && <p className="dataset-name">{summary.name}</p>}
            <p className="dataset-range">
              {summary.start} → {summary.end}
            </p>
            <p className="dataset-rows">{summary.rowCount.toLocaleString()} 筆紀錄</p>
          </div>
        ))}
      </div>

      {summaries.length > 0 && (
        <div className="input-group">
          <label htmlFor="preview-symbol">選擇預覽標的</label>
          <select
            id="preview-symbol"
            value={activeSymbol}
            onChange={(event) => setActiveSymbol(event.target.value)}
          >
            {summaries.map((summary) => (
              <option key={summary.symbol} value={summary.symbol}>
                {summary.symbol}｜{summary.name ?? '未命名'}（{summary.start} ~ {summary.end}）
              </option>
            ))}
          </select>
        </div>
      )}

      {previewRows.length > 0 ? (
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
              {previewRows.map((row) => (
                <tr key={`${row.symbol}-${row.timestamp.toISOString()}`}>
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
      ) : (
        <p>尚未在 {activeSymbol || '所選標的'} 中找到可預覽的資料。</p>
      )}

      {latestSnapshot && (
        <div className="snapshot-block">
          <h3>最新倉位快照（{latestSnapshot.date}）</h3>
          {latestSnapshot.positions.length === 0 ? (
            <p>目前無持倉。</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>標的</th>
                    <th>股數</th>
                    <th>均價</th>
                    <th>市值</th>
                    <th>未實現損益</th>
                  </tr>
                </thead>
                <tbody>
                  {latestSnapshot.positions.map((position) => (
                    <tr key={`${position.symbol}-${position.avgPrice}`}> 
                      <td>{position.symbol}</td>
                      <td>{formatNumber(position.quantity, 0)}</td>
                      <td>{formatNumber(position.avgPrice, 2)}</td>
                      <td>{formatNumber(position.marketValue, 0)}</td>
                      <td className={position.unrealizedPnl >= 0 ? 'positive' : 'negative'}>
                        {formatNumber(position.unrealizedPnl, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
