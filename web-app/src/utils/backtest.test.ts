import { describe, expect, it } from 'vitest';
import { runBacktest } from './backtest';
import type { PriceRecord, StrategyConfig } from '../types';

const sampleData: PriceRecord[] = [
  { timestamp: new Date('2024-01-02'), open: 10.5, high: 10.8, low: 10.4, close: 10.7, volume: 1200000 },
  { timestamp: new Date('2024-01-03'), open: 10.7, high: 10.9, low: 10.5, close: 10.8, volume: 1300000 },
  { timestamp: new Date('2024-01-04'), open: 10.8, high: 11.1, low: 10.7, close: 11.0, volume: 1500000 },
  { timestamp: new Date('2024-01-05'), open: 11.0, high: 11.2, low: 10.9, close: 11.1, volume: 1600000 },
  { timestamp: new Date('2024-01-08'), open: 11.1, high: 11.3, low: 11.0, close: 11.2, volume: 1400000 },
  { timestamp: new Date('2024-01-09'), open: 11.2, high: 11.4, low: 11.1, close: 11.3, volume: 1350000 },
  { timestamp: new Date('2024-01-10'), open: 11.3, high: 11.5, low: 11.1, close: 11.2, volume: 1280000 },
  { timestamp: new Date('2024-01-11'), open: 11.2, high: 11.4, low: 11.0, close: 11.1, volume: 1250000 },
  { timestamp: new Date('2024-01-12'), open: 11.1, high: 11.2, low: 10.9, close: 10.95, volume: 1400000 },
  { timestamp: new Date('2024-01-15'), open: 10.95, high: 11.0, low: 10.8, close: 10.85, volume: 1420000 }
];

const config: StrategyConfig = {
  fastPeriod: 3,
  slowPeriod: 5,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  enableRsiFilter: false,
  initialCapital: 100000,
  feeRate: 0.0005
};

describe('runBacktest', () => {
  it('should generate metrics and trades without throwing error', () => {
    const result = runBacktest(sampleData, config);
    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.metrics.totalReturn).toBeTypeOf('number');
  });

  it('should reject invalid configuration', () => {
    expect(() =>
      runBacktest(sampleData, { ...config, slowPeriod: 2 })
    ).toThrowError('長均線週期需大於短均線週期。');
  });
});
