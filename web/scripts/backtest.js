import { buildIndicatorSeries, relativeStrengthIndex, simpleMovingAverage } from './indicators.js';
import { buildPerformanceMetrics } from './metrics.js';

function generateTradeId(strategyId, index, side) {
  return `${strategyId}-${side}-${index}`;
}

export function runBacktest(dataset, config) {
  const { rows, symbol } = dataset;
  const { strategy, parameters, initialCapital, feeRate } = config;
  const trades = [];
  const equityCurve = [];
  let cash = initialCapital;
  let position = 0;
  const positionRatio = (parameters.position || 100) / 100;

  let fastSeries = null;
  let slowSeries = null;
  let rsiSeries = null;
  if (strategy.id === 'dual_ma') {
    fastSeries = buildIndicatorSeries(rows, simpleMovingAverage, parameters.fast || 5);
    slowSeries = buildIndicatorSeries(rows, simpleMovingAverage, parameters.slow || 20);
  }
  if (strategy.id === 'rsi_reversal') {
    rsiSeries = relativeStrengthIndex(rows.map((row) => row.close), parameters.period || 14);
  }

  rows.forEach((bar, index) => {
    const price = bar.close;
    const totalEquity = cash + position * price;
    let shouldBuy = false;
    let shouldSell = false;

    if (strategy.id === 'dual_ma' && fastSeries && slowSeries && index > 0) {
      const prevFast = fastSeries[index - 1];
      const prevSlow = slowSeries[index - 1];
      const currFast = fastSeries[index];
      const currSlow = slowSeries[index];
      if (
        !Number.isNaN(prevFast) &&
        !Number.isNaN(prevSlow) &&
        !Number.isNaN(currFast) &&
        !Number.isNaN(currSlow)
      ) {
        shouldBuy = prevFast <= prevSlow && currFast > currSlow;
        shouldSell = prevFast >= prevSlow && currFast < currSlow;
      }
    }

    if (strategy.id === 'rsi_reversal' && rsiSeries) {
      const value = rsiSeries[index];
      const prev = index > 0 ? rsiSeries[index - 1] : undefined;
      if (!Number.isNaN(value) && prev !== undefined && !Number.isNaN(prev)) {
        const overBought = parameters.overBought || 70;
        const overSold = parameters.overSold || 30;
        shouldBuy = prev < overSold && value >= overSold;
        shouldSell = prev > overBought && value <= overBought;
      }
    }

    if (shouldBuy) {
      const targetValue = totalEquity * positionRatio;
      const currentValue = position * price;
      const deltaValue = Math.max(targetValue - currentValue, 0);
      const quantity = Math.floor(deltaValue / price);
      if (quantity > 0 && cash >= quantity * price) {
        const cost = quantity * price;
        const fee = cost * feeRate;
        cash -= cost + fee;
        position += quantity;
        trades.push({
          id: generateTradeId(strategy.id, index, 'B'),
          symbol,
          side: 'buy',
          price,
          quantity,
          timestamp: bar.time,
          remark: `${strategy.name} 買進`
        });
      }
    }

    if (shouldSell && position > 0) {
      const quantity = position;
      const revenue = quantity * price;
      const fee = revenue * feeRate;
      cash += revenue - fee;
      position = 0;
      trades.push({
        id: generateTradeId(strategy.id, index, 'S'),
        symbol,
        side: 'sell',
        price,
        quantity,
        timestamp: bar.time,
        remark: `${strategy.name} 賣出`
      });
    }

    equityCurve.push({ time: bar.time, equity: cash + position * price });
  });

  const metrics = buildPerformanceMetrics(trades, equityCurve);
  return { trades, equityCurve, metrics };
}
