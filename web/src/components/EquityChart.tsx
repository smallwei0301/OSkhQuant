// Version: LBK-20240602
import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { EquityPoint } from '../lib/types';

Chart.register(...registerables);

interface EquityChartProps {
  data: EquityPoint[];
}

export function EquityChart({ data }: EquityChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      return;
    }
    const config: ChartConfiguration<'line', number[], string> = {
      type: 'line',
      data: {
        labels: data.map((point) => point.date),
        datasets: [
          {
            label: '權益曲線',
            data: data.map((point) => Number(point.equity.toFixed(2))),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            tension: 0.2,
            fill: true,
            borderWidth: 2,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8
            }
          },
          y: {
            ticks: {
              callback: (value) => `${Number(value).toLocaleString('zh-TW')}`
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `權益：${context.parsed.y.toLocaleString('zh-TW', { minimumFractionDigits: 2 })}`
            }
          }
        }
      }
    };

    if (chartRef.current) {
      chartRef.current.destroy();
    }
    chartRef.current = new Chart(ctx, config);

    return () => {
      chartRef.current?.destroy();
    };
  }, [data]);

  return (
    <div style={{ width: '100%', height: '320px' }}>
      <canvas ref={canvasRef} aria-label="權益曲線" role="img" />
    </div>
  );
}
