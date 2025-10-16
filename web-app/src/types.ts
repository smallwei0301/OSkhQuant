export interface PriceRecord {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StrategyConfig {
  fastPeriod: number;
  slowPeriod: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  enableRsiFilter: boolean;
  initialCapital: number;
  feeRate: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
  cash: number;
  position: number;
}

export interface TradeRecord {
  entryDate: string;
  exitDate?: string;
  direction: 'long';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  profit?: number;
  returnPct?: number;
  holdingDays?: number;
}

export interface BacktestDiagnostics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  sharpeRatio: number;
  annualReturn: number;
  totalReturn: number;
  winRate: number;
  avgHoldDays: number;
}

export interface BacktestResult {
  equityCurve: EquityPoint[];
  trades: TradeRecord[];
  metrics: BacktestDiagnostics;
}

export interface StockListMeta {
  id: string;
  name: string;
  file: string;
  description?: string;
  count?: number;
}

export interface StockListItem {
  code: string;
  name: string;
  exchange?: string;
}
