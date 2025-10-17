import { describe, expect, it } from 'vitest';
import { runBacktest } from './backtest';
import type { PriceRecord, StrategyConfig } from '../types';

const buildPrice = (date: string, close: number): PriceRecord => ({
  timestamp: new Date(date),
  open: close * 0.98,
  high: close * 1.02,
  low: close * 0.97,
  close,
  volume: 1_000_000,
  symbol: 'TEST'
});

const sampleSeries: Record<string, PriceRecord[]> = {
  TEST: [
    buildPrice('2024-01-02', 10.7),
    buildPrice('2024-01-03', 10.8),
    buildPrice('2024-01-04', 11.0),
    buildPrice('2024-01-05', 11.1),
    buildPrice('2024-01-08', 11.2),
    buildPrice('2024-01-09', 11.3),
    buildPrice('2024-01-10', 11.2),
    buildPrice('2024-01-11', 11.1),
    buildPrice('2024-01-12', 10.95),
    buildPrice('2024-01-15', 10.85)
  ]
};

const baseConfig: StrategyConfig = {
  versionCode: 'TEST',
  strategyId: 'test-strategy',
  strategyName: 'Vitest Strategy',
  strategyType: 'dualMa',
  selectedSymbols: ['TEST'],
  fastPeriod: 3,
  slowPeriod: 5,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  enableRsiFilter: false,
  initialCapital: 100_000,
  feeRate: 0.0005,
  minCommission: 5,
  commissionRate: 0.0003,
  stampTaxRate: 0.001,
  flowFee: 0.1,
  slippage: {
    mode: 'ratio',
    tickSize: 0.01,
    tickCount: 2,
    ratio: 0.0005
  },
  positionSizing: {
    mode: 'percent',
    value: 0.2,
    maxPositions: 2,
    rebalanceFrequency: 'daily'
  },
  risk: {
    maxDrawdownPct: 0.2,
    maxExposurePct: 0.9,
    maxDailyLossPct: 0.08,
    stopLossPct: 0.1,
    takeProfitPct: 0.2,
    trailingStopPct: 0.05
  },
  tradingSession: {
    start: '09:00',
    end: '13:30'
  },
  timezone: 'Asia/Taipei',
  allowOvernight: true,
  customLogic: '',
  notes: ''
};

describe('runBacktest', () => {
  it('produces equity curve and metrics for valid configuration', () => {
    const result = runBacktest(sampleSeries, baseConfig);
    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.metrics.totalReturn).toBeTypeOf('number');
    expect(result.trades.length).toBeGreaterThanOrEqual(0);
    expect(result.versionCode).toBe('TEST');
  });

  it('rejects invalid moving average configuration', () => {
    expect(() =>
      runBacktest(sampleSeries, { ...baseConfig, slowPeriod: 2 })
    ).toThrowError('長均線週期需大於短均線週期。');
  });

  it('triggers risk alert when daily loss threshold breached', () => {
    const bearishSeries: Record<string, PriceRecord[]> = {
      TEST: [
        buildPrice('2024-02-01', 12),
        buildPrice('2024-02-02', 11.5),
        buildPrice('2024-02-05', 10.5),
        buildPrice('2024-02-06', 9.5)
      ]
    };
    const result = runBacktest(bearishSeries, {
      ...baseConfig,
      selectedSymbols: ['TEST'],
      risk: { ...baseConfig.risk, maxDailyLossPct: 0.02 },
      versionCode: 'TEST'
    });
    expect(result.riskAlerts.some((alert) => alert.type === 'maxDailyLoss')).toBe(true);
  });
});
