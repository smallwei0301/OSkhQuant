export interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: string;
  pnl: number;
}

export interface CostBreakdown {
  totalCommission: number;
  totalSlippage: number;
  totalTax: number;
}

export interface TradeSignal {
  symbol: string;
  signal: string;
  confidence: number;
  timestamp: string;
}

export interface ResultsResponse {
  equityCurve: EquityPoint[];
  trades: TradeRecord[];
  costs: CostBreakdown;
  signals: TradeSignal[];
}
