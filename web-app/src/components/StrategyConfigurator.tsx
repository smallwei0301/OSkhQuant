import type { StrategyConfig } from '../types';

interface StrategyConfiguratorProps {
  config: StrategyConfig;
  onChange: (config: StrategyConfig) => void;
  onRun: () => void;
  disabled?: boolean;
}

export function StrategyConfigurator({ config, onChange, onRun, disabled }: StrategyConfiguratorProps) {
  const update = (partial: Partial<StrategyConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <div className="card">
      <h2>策略參數設定</h2>
      <div className="content-grid">
        <div className="input-group">
          <label htmlFor="fast-period">短天期均線</label>
          <input
            id="fast-period"
            type="number"
            min={2}
            value={config.fastPeriod}
            onChange={(event) => update({ fastPeriod: Number(event.target.value) })}
          />
        </div>
        <div className="input-group">
          <label htmlFor="slow-period">長天期均線</label>
          <input
            id="slow-period"
            type="number"
            min={config.fastPeriod + 1}
            value={config.slowPeriod}
            onChange={(event) => update({ slowPeriod: Number(event.target.value) })}
          />
        </div>
        <div className="input-group">
          <label htmlFor="initial-capital">初始資金 (人民幣)</label>
          <input
            id="initial-capital"
            type="number"
            min={10000}
            step={1000}
            value={config.initialCapital}
            onChange={(event) => update({ initialCapital: Number(event.target.value) })}
          />
        </div>
        <div className="input-group">
          <label htmlFor="fee-rate">手續費率</label>
          <input
            id="fee-rate"
            type="number"
            min={0}
            step={0.0001}
            value={config.feeRate}
            onChange={(event) => update({ feeRate: Number(event.target.value) })}
          />
        </div>
        <div className="input-group">
          <label htmlFor="rsi-period">RSI 週期</label>
          <input
            id="rsi-period"
            type="number"
            min={2}
            value={config.rsiPeriod}
            onChange={(event) => update({ rsiPeriod: Number(event.target.value) })}
          />
        </div>
        <div className="input-group">
          <label htmlFor="rsi-overbought">RSI 超買門檻</label>
          <input
            id="rsi-overbought"
            type="number"
            min={50}
            max={100}
            value={config.rsiOverbought}
            onChange={(event) => update({ rsiOverbought: Number(event.target.value) })}
          />
        </div>
        <div className="input-group">
          <label htmlFor="rsi-oversold">RSI 超賣門檻</label>
          <input
            id="rsi-oversold"
            type="number"
            min={0}
            max={50}
            value={config.rsiOversold}
            onChange={(event) => update({ rsiOversold: Number(event.target.value) })}
          />
        </div>
        <div className="input-group">
          <label htmlFor="enable-rsi">
            <input
              id="enable-rsi"
              type="checkbox"
              checked={config.enableRsiFilter}
              onChange={(event) => update({ enableRsiFilter: event.target.checked })}
            />
            啟用 RSI 篩選
          </label>
        </div>
      </div>
      <button className="button" onClick={onRun} disabled={disabled}>
        🚀 執行回測
      </button>
    </div>
  );
}
