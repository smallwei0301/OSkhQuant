export function formatCurrency(value: number, digits = 0): string {
  return new Intl.NumberFormat('zh-Hans-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('zh-Hans-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}
