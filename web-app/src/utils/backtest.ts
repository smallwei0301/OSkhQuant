import type { BacktestDiagnostics, BacktestResult, PriceRecord, StrategyConfig, TradeRecord } from '../types';

function calculateSma(series: number[], window: number): number[] {
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < series.length; i += 1) {
    sum += series[i];
    if (i >= window) {
      sum -= series[i - window];
    }
    if (i >= window - 1) {
      result.push(sum / window);
    } else {
      result.push(NaN);
    }
  }
  return result;
}

function calculateRsi(series: number[], period: number): number[] {
  if (period <= 1) {
    return series.map(() => NaN);
  }
  const gains: number[] = [];
  const losses: number[] = [];
  const rsi: number[] = [NaN];

  for (let i = 1; i < series.length; i += 1) {
    const diff = series[i] - series[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < series.length; i += 1) {
    if (i === 0) {
      rsi[i] = NaN;
      continue;
    }
    if (i < period) {
      avgGain += gains[i - 1] || 0;
      avgLoss += losses[i - 1] || 0;
      rsi[i] = NaN;
      continue;
    }
    if (i === period) {
      avgGain /= period;
      avgLoss /= period;
    } else {
      avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
    }

    if (avgLoss === 0) {
      rsi[i] = 100;
      continue;
    }
    const rs = avgGain / avgLoss;
    rsi[i] = 100 - 100 / (1 + rs);
  }

  return rsi;
}

function calculateMaxDrawdown(equity: number[]): { drawdown: number; duration: number } {
  let maxDrawdown = 0;
  let peak = equity[0] ?? 0;
  let duration = 0;
  let tempDuration = 0;

  for (const value of equity) {
    if (value > peak) {
      peak = value;
      tempDuration = 0;
    } else {
      const dd = (peak - value) / peak;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        duration = tempDuration;
      }
      tempDuration += 1;
    }
  }
  return { drawdown: maxDrawdown, duration };
}

function calculateSharpe(dailyReturns: number[]): number {
  if (dailyReturns.length === 0) {
    return 0;
  }
  const mean = dailyReturns.reduce((acc, cur) => acc + cur, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((acc, cur) => acc + (cur - mean) ** 2, 0) / (dailyReturns.length || 1);
  const std = Math.sqrt(variance);
  if (std === 0) {
    return 0;
  }
  return (Math.sqrt(252) * mean) / std;
}

export function runBacktest(data: PriceRecord[], config: StrategyConfig): BacktestResult {
  if (data.length === 0) {
    throw new Error('請先匯入行情資料再執行回測。');
  }
  if (config.slowPeriod <= config.fastPeriod) {
    throw new Error('長均線週期需大於短均線週期。');
  }

  const closes = data.map((item) => item.close);
  const fastSma = calculateSma(closes, config.fastPeriod);
  const slowSma = calculateSma(closes, config.slowPeriod);
  const rsi = calculateRsi(closes, config.rsiPeriod);

  let cash = config.initialCapital;
  let position = 0;
  let entryPrice = 0;
  const trades: TradeRecord[] = [];
  const equityCurve: BacktestResult['equityCurve'] = [];
  const dailyReturns: number[] = [];

  for (let i = 0; i < data.length; i += 1) {
    const bar = data[i];
    const fast = fastSma[i];
    const slow = slowSma[i];
    const currentRsi = rsi[i];
    const dateString = bar.timestamp.toISOString().slice(0, 10);

    const previousEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : cash;
    let currentEquity = cash + position * bar.close;

    const allowRsiBuy = !config.enableRsiFilter || currentRsi <= config.rsiOversold;
    const allowRsiSell = !config.enableRsiFilter || currentRsi >= config.rsiOverbought;

    if (Number.isFinite(fast) && Number.isFinite(slow)) {
      const previousFast = fastSma[i - 1];
      const previousSlow = slowSma[i - 1];

      if (
        position === 0 &&
        Number.isFinite(previousFast) &&
        Number.isFinite(previousSlow) &&
        (previousFast as number) <= (previousSlow as number) &&
        fast > slow &&
        allowRsiBuy
      ) {
        const quantity = Math.floor(cash / bar.close);
        if (quantity > 0) {
          const cost = quantity * bar.close;
          const fee = cost * config.feeRate;
          cash -= cost + fee;
          position = quantity;
          entryPrice = bar.close;
          trades.push({
            entryDate: dateString,
            direction: 'long',
            entryPrice: bar.close,
            quantity,
            holdingDays: 0
          });
          currentEquity = cash + position * bar.close;
        }
      } else if (
        position > 0 &&
        Number.isFinite(previousFast) &&
        Number.isFinite(previousSlow) &&
        (previousFast as number) >= (previousSlow as number) &&
        fast < slow &&
        allowRsiSell
      ) {
        const proceeds = position * bar.close;
        const fee = proceeds * config.feeRate;
        cash += proceeds - fee;
        const trade = trades[trades.length - 1];
        if (trade) {
          const profit = proceeds - fee - trade.entryPrice * trade.quantity;
          trade.exitDate = dateString;
          trade.exitPrice = bar.close;
          trade.profit = profit;
          trade.returnPct = profit / (trade.entryPrice * trade.quantity);
          trade.holdingDays = (trade.holdingDays ?? 0) + 1;
        }
        position = 0;
        entryPrice = 0;
        currentEquity = cash;
      }
    }

    if (position > 0) {
      const trade = trades[trades.length - 1];
      if (trade) {
        trade.holdingDays = (trade.holdingDays ?? 0) + 1;
      }
    }

    equityCurve.push({
      date: dateString,
      equity: currentEquity,
      cash,
      position
    });

    if (equityCurve.length > 1) {
      dailyReturns.push((currentEquity - previousEquity) / previousEquity);
    }
  }

  if (position > 0) {
    const lastBar = data[data.length - 1];
    const proceeds = position * lastBar.close;
    const fee = proceeds * config.feeRate;
    cash += proceeds - fee;
    const trade = trades[trades.length - 1];
    if (trade) {
      const profit = proceeds - fee - trade.entryPrice * trade.quantity;
      trade.exitDate = lastBar.timestamp.toISOString().slice(0, 10);
      trade.exitPrice = lastBar.close;
      trade.profit = profit;
      trade.returnPct = profit / (trade.entryPrice * trade.quantity);
    }
    position = 0;
    equityCurve.push({
      date: lastBar.timestamp.toISOString().slice(0, 10),
      equity: cash,
      cash,
      position
    });
    if (equityCurve.length > 1) {
      const previousEquity = equityCurve[equityCurve.length - 2].equity;
      dailyReturns.push((cash - previousEquity) / previousEquity);
    }
  }

  const totalReturn = (cash - config.initialCapital) / config.initialCapital;
  const tradingDays = Math.max(1, (data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime()) / 86400000);
  const annualReturn = Math.pow(1 + totalReturn, 365 / tradingDays) - 1;
  const { drawdown, duration } = calculateMaxDrawdown(equityCurve.map((item) => item.equity));
  const sharpeRatio = calculateSharpe(dailyReturns);

  const closedTrades = trades.filter((trade) => typeof trade.exitDate !== 'undefined');
  const winningTrades = closedTrades.filter((trade) => (trade.returnPct ?? 0) > 0).length;
  const losingTrades = closedTrades.filter((trade) => (trade.returnPct ?? 0) < 0).length;
  const avgHoldDays =
    closedTrades.reduce((acc, trade) => acc + (trade.holdingDays ?? 0), 0) /
    (closedTrades.length || 1);

  const metrics: BacktestDiagnostics = {
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    maxDrawdown: drawdown,
    maxDrawdownDuration: duration,
    sharpeRatio,
    annualReturn,
    totalReturn,
    winRate: closedTrades.length === 0 ? 0 : winningTrades / closedTrades.length,
    avgHoldDays
  };

  return {
    equityCurve,
    trades,
    metrics
  };
}
