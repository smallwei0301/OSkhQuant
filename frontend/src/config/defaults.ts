export const DEFAULT_DOWNLOAD_SETTINGS = {
  frequency: 'daily',
  adjustment: 'none'
} as const;

export const DEFAULT_RSI_SETTINGS = {
  strategyName: 'RSI',
  rsi: {
    period: 14,
    overbought: 70,
    oversold: 30,
    timeframe: '1d'
  },
  capital: {
    initialCapital: 1_000_000,
    maxPositions: 5,
    riskPerTrade: 0.01
  },
  positionSizing: 'percent' as const,
  slippage: 0.01,
  commission: 0.1425
};
