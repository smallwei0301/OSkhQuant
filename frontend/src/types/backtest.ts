export interface RsiConfig {
  period: number;
  overbought: number;
  oversold: number;
  timeframe: string;
}

export interface CapitalConfig {
  initialCapital: number;
  maxPositions: number;
  riskPerTrade: number;
}

export interface BacktestFormValues {
  strategyName: string;
  rsi: RsiConfig;
  capital: CapitalConfig;
  symbolList: string[];
  startDate: string;
  endDate: string;
  dateRange?: [string, string];
  positionSizing: 'fixed' | 'percent';
  slippage: number;
  commission: number;
  files: File[];
}

export interface BacktestResponse {
  taskId: string;
}
