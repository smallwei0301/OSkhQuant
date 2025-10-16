import type { BacktestDiagnostics } from '../types';
import { formatNumber, formatPercent } from '../utils/format';

interface MetricsBoardProps {
  metrics: BacktestDiagnostics | null;
}

export function MetricsBoard({ metrics }: MetricsBoardProps) {
  if (!metrics) {
    return <p>尚未執行回測。</p>;
  }
  const items = [
    { label: '總報酬率', value: formatPercent(metrics.totalReturn) },
    { label: '年化報酬率', value: formatPercent(metrics.annualReturn) },
    { label: '夏普值', value: formatNumber(metrics.sharpeRatio, 2) },
    { label: 'Sortino', value: formatNumber(metrics.sortinoRatio, 2) },
    { label: 'Calmar', value: formatNumber(metrics.calmarRatio, 2) },
    { label: '最大回撤', value: formatPercent(metrics.maxDrawdown) },
    { label: '最大回撤持續日數', value: `${formatNumber(metrics.maxDrawdownDuration, 0)} 天` },
    { label: '勝率', value: formatPercent(metrics.winRate) },
    { label: '總交易筆數', value: formatNumber(metrics.totalTrades, 0) },
    { label: '平均持有日數', value: formatNumber(metrics.avgHoldDays, 1) },
    { label: '平均曝險', value: formatPercent(metrics.exposure) },
    { label: '年化波動率', value: formatPercent(metrics.volatility) },
    { label: 'Profit Factor', value: formatNumber(metrics.profitFactor, 2) },
    { label: '平均單筆獲利', value: `${formatNumber(metrics.averageWin, 0)} 元` },
    { label: '平均單筆虧損', value: `${formatNumber(metrics.averageLoss, 0)} 元` }
  ];
  return (
    <div className="metrics-grid">
      {items.map((item) => (
        <div className="metric-card" key={item.label}>
          <h4>{item.label}</h4>
          <p>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
