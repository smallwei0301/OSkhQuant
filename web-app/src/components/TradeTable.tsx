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
            <th>標的</th>
            <th>方向</th>
            <th>進場日</th>
            <th>出場日</th>
            <th>進場價</th>
            <th>出場價</th>
            <th>股數</th>
            <th>盈虧 (元)</th>
            <th>報酬率</th>
            <th>持有日數</th>
            <th>費用</th>
            <th>出場原因</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, index) => (
            <tr key={`${trade.entryDate}-${trade.symbol}-${index}`}>
              <td>{trade.symbol}</td>
              <td>{trade.direction === 'long' ? '做多' : '做空'}</td>
              <td>{trade.entryDate}</td>
              <td>{trade.exitDate ?? '-'}</td>
              <td>{formatNumber(trade.entryPrice, 2)}</td>
              <td>{trade.exitPrice ? formatNumber(trade.exitPrice, 2) : '-'}</td>
              <td>{formatNumber(trade.quantity, 0)}</td>
              <td className={trade.profit && trade.profit >= 0 ? 'positive' : 'negative'}>
                {typeof trade.profit === 'number' ? formatNumber(trade.profit, 2) : '-'}
              </td>
              <td>
                {typeof trade.returnPct === 'number' ? formatPercent(trade.returnPct) : '-'}
              </td>
              <td>{trade.holdingDays ? formatNumber(trade.holdingDays, 0) : '-'}</td>
              <td>{trade.fees ? formatNumber(trade.fees, 2) : '-'}</td>
              <td>{trade.stopReason ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
