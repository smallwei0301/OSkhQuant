import { ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis, Area, Legend } from 'recharts';
import type { EquityPoint } from '../types';
import { formatNumber } from '../utils/format';

interface EquityChartProps {
  data: EquityPoint[];
}

export function EquityChart({ data }: EquityChartProps) {
  if (data.length === 0) {
    return <p>尚未產生權益曲線。</p>;
  }

  const chartData = data.map((point) => ({
    ...point,
    drawdownPercent: point.drawdownPct * -100,
    exposurePercent: point.exposurePct * 100
  }));

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.2)" />
          <XAxis dataKey="date" minTickGap={32} tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            tickFormatter={(value) => `${formatNumber(value / 10000, 1)} 萬`}
            stroke="#94a3b8"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => `${value.toFixed(0)}%`}
            stroke="#cbd5f5"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderRadius: '0.75rem',
              border: '1px solid rgba(148,163,184,0.3)',
              color: '#e2e8f0'
            }}
            formatter={(value: number, name) => {
              if (name === 'drawdownPercent' || name === 'exposurePercent') {
                return [`${value.toFixed(2)}%`, name === 'drawdownPercent' ? '回撤' : '曝險'];
              }
              return [`${formatNumber(value, 0)} 元`, '權益'];
            }}
            labelFormatter={(label) => `日期：${label}`}
          />
          <Legend
            verticalAlign="top"
            align="left"
            wrapperStyle={{ color: '#cbd5f5', fontSize: 12, paddingBottom: 8 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="equity"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={false}
            name="權益"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="drawdownPercent"
            stroke="#f87171"
            fill="rgba(248,113,113,0.25)"
            name="回撤"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="exposurePercent"
            stroke="#fbbf24"
            strokeWidth={1.5}
            dot={false}
            name="曝險"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
