function calculateAnnualReturn(equityCurve) {
  if (equityCurve.length < 2) return 0;
  const start = equityCurve[0];
  const end = equityCurve[equityCurve.length - 1];
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.max((end.time.getTime() - start.time.getTime()) / msPerDay, 1);
  const years = days / 365;
  const totalReturn = (end.equity - start.equity) / start.equity;
  return Math.pow(1 + totalReturn, 1 / years) - 1;
}

function calculateMaxDrawdown(equityCurve) {
  let peak = -Infinity;
  let maxDrawdown = 0;
  equityCurve.forEach((point) => {
    peak = Math.max(peak, point.equity);
    if (peak > 0) {
      const drawdown = (point.equity - peak) / peak;
      maxDrawdown = Math.min(maxDrawdown, drawdown);
    }
  });
  return Math.abs(maxDrawdown);
}

function calculateSharpe(equityCurve) {
  if (equityCurve.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < equityCurve.length; i += 1) {
    const prev = equityCurve[i - 1].equity;
    const current = equityCurve[i].equity;
    returns.push(prev ? (current - prev) / prev : 0);
  }
  const avg = returns.reduce((acc, value) => acc + value, 0) / returns.length;
  const variance = returns.reduce((acc, value) => acc + (value - avg) ** 2, 0) / (returns.length || 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (avg / std) * Math.sqrt(252);
}

function calculateWinRate(trades) {
  const paired = [];
  trades.forEach((trade) => {
    if (trade.side === 'buy') {
      paired.push({ buy: trade });
    } else {
      const open = paired.find((pair) => pair.buy && !pair.sell && pair.buy.symbol === trade.symbol);
      if (open) {
        open.sell = trade;
      }
    }
  });
  const completed = paired.filter((pair) => pair.buy && pair.sell);
  if (!completed.length) return 0;
  const wins = completed.filter((pair) => pair.sell.price > pair.buy.price).length;
  return wins / completed.length;
}

function calculateProfitFactor(trades) {
  let grossProfit = 0;
  let grossLoss = 0;
  let inventory = null;
  trades.forEach((trade) => {
    if (trade.side === 'buy') {
      inventory = trade;
      return;
    }
    if (inventory) {
      const pnl = (trade.price - inventory.price) * inventory.quantity;
      if (pnl >= 0) grossProfit += pnl;
      else grossLoss += Math.abs(pnl);
      inventory = null;
    }
  });
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}

export function buildPerformanceMetrics(trades, equityCurve) {
  if (!equityCurve.length) {
    return {
      totalReturn: 0,
      annualReturn: 0,
      maxDrawdown: 0,
      sharpe: 0,
      winRate: 0,
      profitFactor: 0,
      exposure: 0
    };
  }
  const startEquity = equityCurve[0].equity;
  const endEquity = equityCurve[equityCurve.length - 1].equity;
  const totalReturn = startEquity > 0 ? (endEquity - startEquity) / startEquity : 0;
  const annualReturn = calculateAnnualReturn(equityCurve);
  const maxDrawdown = calculateMaxDrawdown(equityCurve);
  const sharpe = calculateSharpe(equityCurve);
  const winRate = calculateWinRate(trades);
  const profitFactor = calculateProfitFactor(trades);
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.max((equityCurve[equityCurve.length - 1].time - equityCurve[0].time) / msPerDay, 1);
  const exposure = trades.length ? Math.min(1, (trades.length * 2) / (days + 1)) : 0;
  return { totalReturn, annualReturn, maxDrawdown, sharpe, winRate, profitFactor, exposure };
}
