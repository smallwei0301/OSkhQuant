import { ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import type { EquityPoint } from '../types';
import { formatNumber } from '../utils/format';

interface EquityChartProps {
  data: EquityPoint[];
}

export function EquityChart({ data }: EquityChartProps) {
  if (data.length === 0) {
    return <p>尚未產生權益曲線。</p>;
  }
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.2)" />
          <XAxis dataKey="date" hide interval="preserveStartEnd" />
          <YAxis tickFormatter={(value) => formatNumber(value / 10000, 1) + '萬'} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '0.75rem', border: '1px solid rgba(148,163,184,0.3)' }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value: number) => `${formatNumber(value, 0)} 元`}
          />
          <Line type="monotone" dataKey="equity" stroke="#38bdf8" strokeWidth={2} dot={false} name="權益" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
