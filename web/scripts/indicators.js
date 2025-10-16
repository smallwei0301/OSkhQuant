export function simpleMovingAverage(values, period) {
  const result = [];
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) {
      sum -= values[i - period];
    }
    if (i >= period - 1) {
      result.push(sum / period);
    } else {
      result.push(NaN);
    }
  }
  return result;
}

export function relativeStrengthIndex(values, period) {
  const gains = [];
  const losses = [];
  const result = [];
  for (let i = 0; i < values.length; i += 1) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
      result.push(NaN);
      continue;
    }
    const change = values[i] - values[i - 1];
    gains.push(Math.max(change, 0));
    losses.push(Math.max(-change, 0));
    if (i < period) {
      result.push(NaN);
      continue;
    }
    const sliceStart = i - period + 1;
    const avgGain = average(gains.slice(sliceStart, i + 1));
    const avgLoss = average(losses.slice(sliceStart, i + 1));
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

export function average(values) {
  if (!values.length) return 0;
  const total = values.reduce((acc, value) => acc + value, 0);
  return total / values.length;
}

export function buildIndicatorSeries(rows, indicator, period) {
  const closes = rows.map((row) => row.close);
  return indicator(closes, period);
}
