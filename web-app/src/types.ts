export type BarFrequency = 'daily' | 'intraday' | 'unknown';

export interface PriceRecord {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
}

export interface ParsedPriceSeries {
  symbol: string;
  records: PriceRecord[];
  frequency: BarFrequency;
  sourceName: string;
  start: Date;
  end: Date;
}

export interface UploadedDatasetSummary {
  symbol: string;
  name: string;
  start: string;
  end: string;
  rowCount: number;
  frequency: BarFrequency;
}

export type StrategyType = 'dualMa' | 'rsiReversal' | 'custom';

export type PositionSizingMode = 'fixed' | 'percent' | 'volatility';

export type RebalanceFrequency = 'daily' | 'weekly' | 'monthly';

export interface StrategyConfig {
  versionCode: string;
  strategyId: string;
  strategyName: string;
  strategyType: StrategyType;
  selectedSymbols: string[];
  fastPeriod: number;
  slowPeriod: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  enableRsiFilter: boolean;
  initialCapital: number;
  feeRate: number;
  minCommission: number;
  commissionRate: number;
  stampTaxRate: number;
  flowFee: number;
  slippage: {
    mode: 'tick' | 'ratio';
    tickSize: number;
    tickCount: number;
    ratio: number;
  };
  positionSizing: {
    mode: PositionSizingMode;
    value: number;
    maxPositions: number;
    rebalanceFrequency: RebalanceFrequency;
    rebalanceWeekday?: number;
  };
  risk: {
    maxDrawdownPct: number;
    maxExposurePct: number;
    maxDailyLossPct: number;
    stopLossPct: number;
    takeProfitPct: number;
    trailingStopPct: number;
  };
  tradingSession: {
    start: string;
    end: string;
  };
  timezone: string;
  allowOvernight: boolean;
  customLogic?: string;
  notes?: string;
}

export interface EquityPoint {
  date: string;
  equity: number;
  cash: number;
  positions: number;
  exposurePct: number;
  drawdownPct: number;
}

export interface PortfolioPositionSnapshot {
  symbol: string;
  quantity: number;
  avgPrice: number;
  marketValue: number;
  unrealizedPnl: number;
}

export interface PortfolioSnapshot {
  date: string;
  equity: number;
  cash: number;
  exposurePct: number;
  drawdownPct: number;
  positions: PortfolioPositionSnapshot[];
}

export interface TradeRecord {
  symbol: string;
  direction: 'long' | 'short';
  entryDate: string;
  exitDate?: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  profit?: number;
  returnPct?: number;
  holdingDays?: number;
  fees?: number;
  slippageCost?: number;
  stopReason?: string;
}

export interface BacktestDiagnostics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  annualReturn: number;
  totalReturn: number;
  winRate: number;
  avgHoldDays: number;
  exposure: number;
  volatility: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
}

export interface StockListItem {
  code: string;
  name: string;
  exchange?: string;
  industry?: string;
  listingDate?: string;
  isin?: string;
}

export type TwseListingRow = Record<string, string | undefined> & {
  '公司代號'?: string;
  '證券代號'?: string;
  '股票代號'?: string;
  Symbol?: string;
  'stock_code'?: string;
  '公司名稱'?: string;
  '證券名稱'?: string;
  '公司簡稱'?: string;
  '英文簡稱'?: string;
  '市場別'?: string;
  market?: string;
  '產業別'?: string;
  '產業分類'?: string;
  industry?: string;
  '上市日'?: string;
  'listing_date'?: string;
  '國際證券辨識號碼'?: string;
  'ISIN Code'?: string;
  isin?: string;
  'ISIN碼'?: string;
};

export interface RiskAlert {
  date: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'drawdown' | 'exposure' | 'stopLoss' | 'takeProfit' | 'maxDailyLoss' | 'custom';
  message: string;
}

export interface BacktestLogEntry {
  date: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface BacktestResult {
  equityCurve: EquityPoint[];
  trades: TradeRecord[];
  metrics: BacktestDiagnostics;
  riskAlerts: RiskAlert[];
  snapshots: PortfolioSnapshot[];
  logs: BacktestLogEntry[];
  datasetCoverage: UploadedDatasetSummary[];
  versionCode: string;
}

export interface SchedulerPlan {
  id: string;
  name: string;
  cron: string;
  strategyId: string;
  lastRun?: string;
  nextRun?: string;
  enabled: boolean;
}
