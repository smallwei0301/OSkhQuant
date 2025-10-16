import type { TradeRecord } from '../types';
import { formatNumber, formatPercent } from '../utils/format';

interface TradeTableProps {
  trades: TradeRecord[];
}

export function TradeTable({ trades }: TradeTableProps) {
  if (trades.length === 0) {
    return <p>尚未產生任何交易紀錄。</p>;
  }
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>進場日</th>
            <th>出場日</th>
            <th>進場價</th>
            <th>出場價</th>
            <th>股數</th>
            <th>盈虧 (元)</th>
            <th>報酬率</th>
            <th>持有日數</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, index) => (
            <tr key={`${trade.entryDate}-${index}`}>
              <td>{trade.entryDate}</td>
              <td>{trade.exitDate ?? '-'}</td>
              <td>{formatNumber(trade.entryPrice, 2)}</td>
              <td>{trade.exitPrice ? formatNumber(trade.exitPrice, 2) : '-'}</td>
              <td>{formatNumber(trade.quantity, 0)}</td>
              <td>{trade.profit ? formatNumber(trade.profit, 2) : '-'}</td>
              <td>{typeof trade.returnPct === 'number' ? formatPercent(trade.returnPct) : '-'}</td>
              <td>{trade.holdingDays ? formatNumber(trade.holdingDays, 0) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
