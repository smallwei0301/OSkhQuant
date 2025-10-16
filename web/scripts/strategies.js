export const PRESET_STRATEGIES = [
  {
    id: 'dual_ma',
    name: '雙均線趨勢策略',
    description: '利用快慢線交叉決定進出場，適用於順勢行情。',
    parameters: [
      { key: 'fast', label: '快線天數', min: 3, max: 30, step: 1, defaultValue: 5 },
      { key: 'slow', label: '慢線天數', min: 10, max: 120, step: 1, defaultValue: 20 },
      { key: 'position', label: '單筆資金比率 (%)', min: 10, max: 100, step: 5, defaultValue: 80 }
    ]
  },
  {
    id: 'rsi_reversal',
    name: 'RSI 反轉策略',
    description: 'RSI 超賣買進、超買賣出，適合箱型盤整行情。',
    parameters: [
      { key: 'period', label: 'RSI 週期', min: 5, max: 30, step: 1, defaultValue: 14 },
      { key: 'overBought', label: '超買閾值', min: 60, max: 90, step: 1, defaultValue: 70 },
      { key: 'overSold', label: '超賣閾值', min: 10, max: 40, step: 1, defaultValue: 30 },
      { key: 'position', label: '單筆資金比率 (%)', min: 10, max: 100, step: 5, defaultValue: 60 }
    ]
  }
];

export function getDefaultParameters(strategyId) {
  const strategy = PRESET_STRATEGIES.find((item) => item.id === strategyId) || PRESET_STRATEGIES[0];
  return strategy.parameters.reduce((acc, param) => {
    acc[param.key] = param.defaultValue;
    return acc;
  }, {});
}
