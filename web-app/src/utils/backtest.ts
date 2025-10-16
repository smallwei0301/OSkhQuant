import type {
  BacktestLogEntry,
  BacktestResult,
  EquityPoint,
  PortfolioSnapshot,
  PriceRecord,
  RiskAlert,
  StrategyConfig,
  TradeRecord,
  UploadedDatasetSummary
} from '../types';

interface PositionState {
  symbol: string;
  quantity: number;
  avgPrice: number;
  entryDate: string;
  fees: number;
  slippageCost: number;
  highestPrice: number;
  lowestPrice: number;
  holdingDays: number;
}

interface SymbolContext {
  symbol: string;
  series: PriceRecord[];
  dateIndex: Map<string, number>;
  fastMa: number[];
  slowMa: number[];
  rsi: number[];
  volatility: number[];
}

const isRebalanceWindow = (
  dateKey: string,
  previousDateKey: string | null,
  sizing: StrategyConfig['positionSizing']
): boolean => {
  if (sizing.rebalanceFrequency === 'daily') {
    return true;
  }
  const current = new Date(`${dateKey}T00:00:00Z`);
  if (sizing.rebalanceFrequency === 'weekly') {
    const weekday = current.getUTCDay() === 0 ? 7 : current.getUTCDay();
    const targetWeekday = sizing.rebalanceWeekday ?? 5;
    return weekday === targetWeekday;
  }
  if (!previousDateKey) {
    return true;
  }
  const previous = new Date(`${previousDateKey}T00:00:00Z`);
  return current.getUTCMonth() !== previous.getUTCMonth();
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const calculateSma = (series: number[], window: number): number[] => {
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
};

const calculateRsi = (series: number[], period: number): number[] => {
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
};

const calculateStdDev = (series: number[], window: number): number[] => {
  const result: number[] = [];
  const values: number[] = [];
  for (let i = 0; i < series.length; i += 1) {
    if (i === 0) {
      result.push(NaN);
      continue;
    }
    const returnValue = (series[i] - series[i - 1]) / series[i - 1];
    values.push(returnValue);
    if (values.length > window) {
      values.shift();
    }
    if (values.length < window) {
      result.push(NaN);
      continue;
    }
    const mean = values.reduce((acc, cur) => acc + cur, 0) / values.length;
    const variance = values.reduce((acc, cur) => acc + (cur - mean) ** 2, 0) / values.length;
    result.push(Math.sqrt(variance));
  }
  return result;
};

const std = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const mean = values.reduce((acc, cur) => acc + cur, 0) / values.length;
  const variance = values.reduce((acc, cur) => acc + (cur - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const groupByDate = (records: PriceRecord[]): PriceRecord[] => {
  const grouped = new Map<string, PriceRecord>();
  for (const record of records) {
    const key = toDateKey(record.timestamp);
    const existing = grouped.get(key);
    if (!existing || record.timestamp.getTime() > existing.timestamp.getTime()) {
      grouped.set(key, { ...record });
    }
  }
  return Array.from(grouped.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

const createSymbolContext = (symbol: string, series: PriceRecord[], config: StrategyConfig): SymbolContext => {
  const groupedSeries = groupByDate(series);
  const closes = groupedSeries.map((item) => item.close);
  const fastMa = calculateSma(closes, config.fastPeriod);
  const slowMa = calculateSma(closes, config.slowPeriod);
  const rsi = calculateRsi(closes, config.rsiPeriod);
  const volatility = calculateStdDev(closes, 20);
  const dateIndex = new Map<string, number>();
  groupedSeries.forEach((record, index) => {
    dateIndex.set(toDateKey(record.timestamp), index);
  });
  return {
    symbol,
    series: groupedSeries,
    dateIndex,
    fastMa,
    slowMa,
    rsi,
    volatility
  };
};

const applyTradeCosts = (
  price: number,
  quantity: number,
  direction: 'buy' | 'sell',
  config: StrategyConfig
) => {
  const basePrice = price;
  let fillPrice = price;
  let slippageCost = 0;

  if (quantity <= 0) {
    return {
      fillPrice,
      totalCost: 0,
      totalFee: 0,
      slippageCost,
      commission: 0,
      stampTax: 0,
      flowFee: 0
    };
  }

  if (config.slippage.mode === 'tick') {
    const slip = config.slippage.tickSize * config.slippage.tickCount;
    fillPrice = direction === 'buy' ? price + slip : price - slip;
    slippageCost = Math.abs(fillPrice - basePrice) * quantity;
  } else {
    const slip = price * config.slippage.ratio;
    fillPrice = direction === 'buy' ? price + slip : price - slip;
    slippageCost = Math.abs(slip) * quantity;
  }

  const gross = fillPrice * quantity;
  const commissionRate = Math.max(config.feeRate, config.commissionRate);
  const commission = Math.max(gross * commissionRate, config.minCommission);
  const stampTax = direction === 'sell' ? gross * config.stampTaxRate : 0;
  const flowFee = quantity > 0 ? config.flowFee : 0;
  const totalFee = commission + stampTax + flowFee;
  const totalCost = direction === 'buy' ? gross + totalFee : gross - totalFee;

  return { fillPrice, totalCost, totalFee, slippageCost, commission, stampTax, flowFee };
};

const ensureDatasetCoverage = (
  symbols: string[],
  contexts: SymbolContext[],
  provided?: UploadedDatasetSummary[]
): UploadedDatasetSummary[] => {
  if (provided && provided.length > 0) {
    return provided.filter((summary) => symbols.includes(summary.symbol));
  }
  return contexts.map((ctx) => ({
    symbol: ctx.symbol,
    name: ctx.symbol,
    start: toDateKey(ctx.series[0].timestamp),
    end: toDateKey(ctx.series[ctx.series.length - 1].timestamp),
    rowCount: ctx.series.length,
    frequency: 'daily'
  }));
};

export function runBacktest(
  priceSeries: Record<string, PriceRecord[]>,
  config: StrategyConfig,
  datasetCoverage?: UploadedDatasetSummary[]
): BacktestResult {
  const selectedSymbols = config.selectedSymbols.filter((symbol) => priceSeries[symbol]);
  if (selectedSymbols.length === 0) {
    throw new Error('找不到可用的行情資料，請確認已匯入對應標的。');
  }

  if (config.slowPeriod <= config.fastPeriod) {
    throw new Error('長均線週期需大於短均線週期。');
  }

  const symbolContexts = selectedSymbols.map((symbol) => createSymbolContext(symbol, priceSeries[symbol], config));
  const allDates = Array.from(
    new Set(symbolContexts.flatMap((ctx) => ctx.series.map((record) => toDateKey(record.timestamp))))
  ).sort();

  if (allDates.length === 0) {
    throw new Error('行情資料不足，請確認 CSV 內容是否包含有效的日期與價格。');
  }

  const positions = new Map<string, PositionState>();
  const openTrades = new Map<string, TradeRecord>();
  const lastPrices = new Map<string, number>();
  const equityCurve: EquityPoint[] = [];
  const snapshots: PortfolioSnapshot[] = [];
  const trades: TradeRecord[] = [];
  const riskAlerts: RiskAlert[] = [];
  const logs: BacktestLogEntry[] = [];
  const dailyReturns: number[] = [];
  const exposures: number[] = [];

  let cash = config.initialCapital;
  let peakEquity = config.initialCapital;
  let maxDrawdown = 0;
  let maxDrawdownDuration = 0;
  let drawdownDuration = 0;
  let tradingHaltedForDay = false;

  const datasetSummaries = ensureDatasetCoverage(selectedSymbols, symbolContexts, datasetCoverage);

  symbolContexts.forEach((ctx) => {
    if (ctx.series.length > 0) {
      lastPrices.set(ctx.symbol, ctx.series[0].close);
    }
  });

  const evaluateCustomLogic = (() => {
    if (config.strategyType !== 'custom' || !config.customLogic?.trim()) {
      return null;
    }
    try {
      // eslint-disable-next-line no-new-func
      return new Function('ctx', `'use strict'; ${config.customLogic}`) as (
        ctx: {
          symbol: string;
          index: number;
          bar: PriceRecord;
          history: PriceRecord[];
          indicators: { fast: number[]; slow: number[]; rsi: number[]; volatility: number[] };
          portfolio: { cash: number; equity: number; positions: Map<string, PositionState> };
        }
      ) => { action: 'buy' | 'sell' | 'hold'; size?: number } | void;
    } catch (error) {
      throw new Error(`自訂策略語法錯誤：${(error as Error).message}`);
    }
  })();

  const closePosition = (symbol: string, price: number, dateKey: string, reason?: string) => {
    const position = positions.get(symbol);
    if (!position) {
      return;
    }
    const trade = openTrades.get(symbol);
    const cost = applyTradeCosts(price, position.quantity, 'sell', config);
    cash += cost.totalCost;
    const entryCost = position.avgPrice * position.quantity + position.fees + position.slippageCost;
    const profit = cost.totalCost - entryCost;
    if (trade) {
      trade.exitDate = dateKey;
      trade.exitPrice = cost.fillPrice;
      trade.profit = profit;
      trade.returnPct = position.avgPrice === 0 ? 0 : profit / (position.avgPrice * position.quantity);
      trade.holdingDays = position.holdingDays;
      trade.fees = (trade.fees ?? 0) + cost.totalFee + position.fees;
      trade.slippageCost = (trade.slippageCost ?? 0) + cost.slippageCost + position.slippageCost;
      trade.stopReason = reason;
    }
    logs.push({ date: dateKey, level: 'info', message: `${symbol} 平倉${reason ? `（${reason}）` : ''}，股數 ${position.quantity}` });
    positions.delete(symbol);
    if (trade) {
      trades.push(trade);
      openTrades.delete(symbol);
    }
  };

  let previousDateKey: string | null = null;

  for (const dateKey of allDates) {
    tradingHaltedForDay = false;
    const barsToday = symbolContexts
      .map((ctx) => {
        const index = ctx.dateIndex.get(dateKey);
        if (index === undefined) {
          return null;
        }
        return { ctx, index, bar: ctx.series[index] };
      })
      .filter((item): item is { ctx: SymbolContext; index: number; bar: PriceRecord } => Boolean(item));

    if (barsToday.length === 0) {
      continue;
    }

    barsToday.forEach(({ ctx, bar }) => {
      lastPrices.set(ctx.symbol, bar.close);
    });

    // 更新持倉日數與停損
    positions.forEach((position, symbol) => {
      position.holdingDays += 1;
      const price = lastPrices.get(symbol) ?? position.avgPrice;
      position.highestPrice = Math.max(position.highestPrice, price);
      position.lowestPrice = Math.min(position.lowestPrice, price);
      const pnl = (price - position.avgPrice) * position.quantity;
      const pnlPct = position.avgPrice === 0 ? 0 : pnl / (position.avgPrice * position.quantity);
      if (config.risk.stopLossPct > 0 && pnlPct <= -config.risk.stopLossPct) {
        riskAlerts.push({
          date: dateKey,
          severity: 'warning',
          type: 'stopLoss',
          message: `${symbol} 觸發固定停損 (${(pnlPct * 100).toFixed(2)}%)`
        });
        closePosition(symbol, price, dateKey, '固定停損');
      } else if (config.risk.takeProfitPct > 0 && pnlPct >= config.risk.takeProfitPct) {
        riskAlerts.push({
          date: dateKey,
          severity: 'info',
          type: 'takeProfit',
          message: `${symbol} 觸發固定停利 (${(pnlPct * 100).toFixed(2)}%)`
        });
        closePosition(symbol, price, dateKey, '固定停利');
      } else if (
        config.risk.trailingStopPct > 0 &&
        position.highestPrice > 0 &&
        (position.highestPrice - price) / position.highestPrice >= config.risk.trailingStopPct
      ) {
        riskAlerts.push({
          date: dateKey,
          severity: 'warning',
          type: 'stopLoss',
          message: `${symbol} 觸發移動停損`
        });
        closePosition(symbol, price, dateKey, '移動停損');
      }
    });

    // 根據訊號執行交易
    for (const { ctx, index, bar } of barsToday) {
      const symbol = ctx.symbol;
      const fastToday = ctx.fastMa[index];
      const slowToday = ctx.slowMa[index];
      const fastPrev = ctx.fastMa[index - 1];
      const slowPrev = ctx.slowMa[index - 1];
      const rsiToday = ctx.rsi[index];
      const allowBuy = !config.enableRsiFilter || (Number.isFinite(rsiToday) && rsiToday <= config.rsiOversold);
      const allowSell = !config.enableRsiFilter || (Number.isFinite(rsiToday) && rsiToday >= config.rsiOverbought);
      const position = positions.get(symbol);

      let action: 'buy' | 'sell' | 'hold' = 'hold';
      let customSize: number | undefined;

      const portfolioMarketValue = Array.from(positions.entries()).reduce((acc, [sym, pos]) => {
        const price = lastPrices.get(sym) ?? pos.avgPrice;
        return acc + price * pos.quantity;
      }, 0);
      const portfolioEquity = cash + portfolioMarketValue;

      if (config.strategyType === 'dualMa') {
        if (
          !position &&
          Number.isFinite(fastToday) &&
          Number.isFinite(slowToday) &&
          Number.isFinite(fastPrev) &&
          Number.isFinite(slowPrev) &&
          (fastPrev as number) <= (slowPrev as number) &&
          (fastToday as number) > (slowToday as number) &&
          allowBuy
        ) {
          action = 'buy';
        } else if (
          position &&
          Number.isFinite(fastToday) &&
          Number.isFinite(slowToday) &&
          Number.isFinite(fastPrev) &&
          Number.isFinite(slowPrev) &&
          (fastPrev as number) >= (slowPrev as number) &&
          (fastToday as number) < (slowToday as number) &&
          allowSell
        ) {
          action = 'sell';
        }
      } else if (config.strategyType === 'rsiReversal') {
        if (!position && Number.isFinite(rsiToday) && (rsiToday as number) <= config.rsiOversold) {
          action = 'buy';
        } else if (position && Number.isFinite(rsiToday) && (rsiToday as number) >= config.rsiOverbought) {
          action = 'sell';
        }
      } else if (evaluateCustomLogic) {
        try {
          const response = evaluateCustomLogic({
            symbol,
            index,
            bar,
            history: ctx.series,
            indicators: { fast: ctx.fastMa, slow: ctx.slowMa, rsi: ctx.rsi, volatility: ctx.volatility },
            portfolio: { cash, equity: portfolioEquity, positions }
          });
          if (response?.action) {
            action = response.action;
            customSize = response.size;
          }
        } catch (error) {
          logs.push({
            date: dateKey,
            level: 'error',
            message: `自訂策略錯誤（${symbol}）：${(error as Error).message}`
          });
        }
      }

      if (action === 'sell' && positions.has(symbol)) {
        closePosition(symbol, bar.close, dateKey, '策略訊號');
        continue;
      }

      if (action === 'buy' && !positions.has(symbol) && !tradingHaltedForDay) {
        if (!isRebalanceWindow(dateKey, previousDateKey, config.positionSizing)) {
          continue;
        }
        if (positions.size >= config.positionSizing.maxPositions) {
          logs.push({ date: dateKey, level: 'warning', message: '已達最大持倉數，略過加碼。' });
          continue;
        }
        const marketValue = portfolioMarketValue;
        const currentEquity = portfolioEquity;
        const targetValue = (() => {
          if (typeof customSize === 'number' && customSize > 0) {
            return customSize;
          }
          if (config.positionSizing.mode === 'fixed') {
            return config.positionSizing.value;
          }
          if (config.positionSizing.mode === 'percent') {
            return currentEquity * config.positionSizing.value;
          }
          const vol = ctx.volatility[index];
          const riskBudget = currentEquity * config.positionSizing.value;
          const perShareRisk = Math.max(1e-6, (vol || 0.02) * bar.close);
          return riskBudget / perShareRisk * bar.close;
        })();

        const quantity = Math.max(0, Math.floor(targetValue / bar.close));
        if (quantity <= 0) {
          continue;
        }
        const cost = applyTradeCosts(bar.close, quantity, 'buy', config);
        if (cost.totalCost > cash) {
          logs.push({ date: dateKey, level: 'warning', message: '現金不足，無法執行買入。' });
          continue;
        }
        const expectedMarketValue = marketValue + cost.fillPrice * quantity;
        const expectedEquity = cash - cost.totalCost + expectedMarketValue;
        const expectedExposure = expectedEquity === 0 ? 0 : expectedMarketValue / expectedEquity;
        if (expectedExposure > config.risk.maxExposurePct) {
          riskAlerts.push({
            date: dateKey,
            severity: 'warning',
            type: 'exposure',
            message: `預估曝險 ${Math.round(expectedExposure * 100)}% 超過設定上限`
          });
          continue;
        }

        cash -= cost.totalCost;
        positions.set(symbol, {
          symbol,
          quantity,
          avgPrice: cost.fillPrice,
          entryDate: dateKey,
          fees: cost.totalFee,
          slippageCost: cost.slippageCost,
          highestPrice: cost.fillPrice,
          lowestPrice: cost.fillPrice,
          holdingDays: 0
        });
        const trade: TradeRecord = {
          symbol,
          direction: 'long',
          entryDate: dateKey,
          entryPrice: cost.fillPrice,
          quantity,
          fees: cost.totalFee,
          slippageCost: cost.slippageCost
        };
        openTrades.set(symbol, trade);
        logs.push({ date: dateKey, level: 'info', message: `${symbol} 建倉，股數 ${quantity}` });
      }
    }

    const marketValue = Array.from(positions.entries()).reduce((acc, [symbol, position]) => {
      const price = lastPrices.get(symbol) ?? position.avgPrice;
      return acc + price * position.quantity;
    }, 0);
    const equity = cash + marketValue;
    const exposurePct = equity === 0 ? 0 : marketValue / equity;
    const drawdownPct = peakEquity > 0 ? Math.max(0, (peakEquity - equity) / peakEquity) : 0;

    if (equity > peakEquity) {
      peakEquity = equity;
      drawdownDuration = 0;
    } else {
      drawdownDuration += 1;
      if (drawdownPct > maxDrawdown) {
        maxDrawdown = drawdownPct;
        maxDrawdownDuration = drawdownDuration;
      }
    }

    if (drawdownPct >= config.risk.maxDrawdownPct) {
      riskAlerts.push({
        date: dateKey,
        severity: 'critical',
        type: 'drawdown',
        message: `權益回撤 ${(drawdownPct * 100).toFixed(2)}% 超過設定上限`
      });
      logs.push({
        date: dateKey,
        level: 'warning',
        message: `權益回撤觸及 ${(drawdownPct * 100).toFixed(2)}%，建議降低部位或調整策略`
      });
    }

    const previousEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : config.initialCapital;
    if (equityCurve.length > 0) {
      const dailyReturn = (equity - previousEquity) / previousEquity;
      dailyReturns.push(dailyReturn);
      if (dailyReturn <= -config.risk.maxDailyLossPct) {
        tradingHaltedForDay = true;
        riskAlerts.push({
          date: dateKey,
          severity: 'critical',
          type: 'maxDailyLoss',
          message: `單日虧損達 ${(dailyReturn * 100).toFixed(2)}%，停止新增倉位`
        });
        logs.push({
          date: dateKey,
          level: 'warning',
          message: `單日虧損 ${(dailyReturn * 100).toFixed(2)}%，當日不再建立新部位`
        });
      }
    }

    exposures.push(exposurePct);

    equityCurve.push({
      date: dateKey,
      equity,
      cash,
      positions: positions.size,
      exposurePct,
      drawdownPct
    });

    snapshots.push({
      date: dateKey,
      equity,
      cash,
      exposurePct,
      drawdownPct,
      positions: Array.from(positions.entries()).map(([symbol, position]) => {
        const price = lastPrices.get(symbol) ?? position.avgPrice;
        return {
          symbol,
          quantity: position.quantity,
          avgPrice: position.avgPrice,
          marketValue: price * position.quantity,
          unrealizedPnl: (price - position.avgPrice) * position.quantity
        };
      })
    });

    if (!config.allowOvernight) {
      Array.from(positions.keys()).forEach((symbol) => {
        const price = lastPrices.get(symbol) ?? positions.get(symbol)!.avgPrice;
        closePosition(symbol, price, dateKey, '日內平倉');
      });
    }

    previousDateKey = dateKey;
  }

  Array.from(positions.entries()).forEach(([symbol, position]) => {
    const price = lastPrices.get(symbol) ?? position.avgPrice;
    closePosition(symbol, price, equityCurve[equityCurve.length - 1].date, '區間結束');
  });

  const finalEquity = equityCurve[equityCurve.length - 1]?.equity ?? config.initialCapital;
  const totalReturn = (finalEquity - config.initialCapital) / config.initialCapital;
  const tradingDays = equityCurve.length > 0 ? equityCurve.length : 1;
  const annualReturn = Math.pow(1 + totalReturn, 252 / tradingDays) - 1;
  const volatility = Math.sqrt(252) * std(dailyReturns);
  const downsideReturns = dailyReturns.filter((value) => value < 0);
  const averageDailyReturn = dailyReturns.length === 0 ? 0 : dailyReturns.reduce((acc, cur) => acc + cur, 0) / dailyReturns.length;
  const downsideStd = downsideReturns.length === 0 ? 0 : std(downsideReturns);
  const sortinoRatio = downsideStd === 0 ? 0 : (Math.sqrt(252) * averageDailyReturn) / downsideStd;
  const calmarRatio = maxDrawdown === 0 ? 0 : annualReturn / maxDrawdown;

  const winningTrades = trades.filter((trade) => (trade.profit ?? 0) > 0);
  const losingTrades = trades.filter((trade) => (trade.profit ?? 0) < 0);
  const avgHoldDays = trades.reduce((acc, trade) => acc + (trade.holdingDays ?? 0), 0) / (trades.length || 1);
  const sumWins = winningTrades.reduce((acc, trade) => acc + (trade.profit ?? 0), 0);
  const sumLosses = losingTrades.reduce((acc, trade) => acc + Math.abs(trade.profit ?? 0), 0);
  const profitFactor = sumLosses === 0 ? 0 : sumWins / sumLosses;
  const averageWin = winningTrades.length === 0 ? 0 : sumWins / winningTrades.length;
  const averageLoss = losingTrades.length === 0 ? 0 : sumLosses / losingTrades.length;
  const averageExposure = exposures.length === 0 ? 0 : exposures.reduce((acc, cur) => acc + cur, 0) / exposures.length;

  const metrics = {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    maxDrawdown,
    maxDrawdownDuration,
    sharpeRatio: volatility === 0 ? 0 : (Math.sqrt(252) * (dailyReturns.reduce((acc, cur) => acc + cur, 0) / (dailyReturns.length || 1))) / volatility,
    sortinoRatio,
    calmarRatio,
    annualReturn,
    totalReturn,
    winRate: trades.length === 0 ? 0 : winningTrades.length / trades.length,
    avgHoldDays,
    exposure: averageExposure,
    volatility,
    profitFactor,
    averageWin,
    averageLoss: -averageLoss
  };

  logs.push({
    date: equityCurve[equityCurve.length - 1]?.date ?? toDateKey(new Date()),
    level: 'info',
    message: `回測完成：總報酬 ${(totalReturn * 100).toFixed(2)}%，最大回撤 ${(maxDrawdown * 100).toFixed(2)}%`
  });

  return {
    equityCurve,
    trades,
    metrics,
    riskAlerts,
    snapshots,
    logs,
    datasetCoverage: datasetSummaries,
    versionCode: config.versionCode
  };
}
