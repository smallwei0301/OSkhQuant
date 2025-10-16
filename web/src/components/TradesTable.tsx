// Version: LBK-20240602
import { TradeRecord } from '../lib/types';
import './TradesTable.css';

interface TradesTableProps {
  trades: TradeRecord[];
}

export function TradesTable({ trades }: TradesTableProps) {
  if (trades.length === 0) {
    return <p className="table-empty">尚未產生任何交易紀錄。</p>;
  }
  return (
    <div className="table-wrapper" role="region" aria-live="polite">
      <table className="trades-table">
        <thead>
          <tr>
            <th scope="col">日期</th>
            <th scope="col">股票代號</th>
            <th scope="col">動作</th>
            <th scope="col">價格</th>
            <th scope="col">股數</th>
            <th scope="col">手續費</th>
            <th scope="col">現金變動</th>
            <th scope="col">訊號說明</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, index) => (
            <tr key={`${trade.symbol}-${trade.date}-${index}`}>
              <td>{trade.date}</td>
              <td>{trade.symbol}</td>
              <td>
                <span className={`badge badge--${trade.action === 'buy' ? 'buy' : 'sell'}`}>
                  {trade.action === 'buy' ? '買進' : '賣出'}
                </span>
              </td>
              <td>{trade.price.toLocaleString('zh-TW', { minimumFractionDigits: 2 })}</td>
              <td>{trade.shares.toFixed(4)}</td>
              <td>{trade.fee.toLocaleString('zh-TW', { minimumFractionDigits: 2 })}</td>
              <td className={trade.cashChange >= 0 ? 'positive' : 'negative'}>
                {trade.cashChange.toLocaleString('zh-TW', { minimumFractionDigits: 2 })}
              </td>
              <td>{trade.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
