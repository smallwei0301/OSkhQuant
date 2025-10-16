import type { PositionSizingMode, StrategyConfig } from '../types';

interface StrategyConfiguratorProps {
  config: StrategyConfig;
  availableSymbols: string[];
  onChange: (config: StrategyConfig) => void;
  onRun: () => void;
  disabled?: boolean;
  running?: boolean;
}

const POSITION_MODE_LABEL: Record<PositionSizingMode, string> = {
  fixed: '固定金額',
  percent: '資金百分比',
  volatility: '波動率風險均衡'
};

export function StrategyConfigurator({
  config,
  availableSymbols,
  onChange,
  onRun,
  disabled,
  running
}: StrategyConfiguratorProps) {
  const update = (partial: Partial<StrategyConfig>) => {
    onChange({ ...config, ...partial });
  };

  const updateSlippage = (partial: Partial<StrategyConfig['slippage']>) => {
    update({ slippage: { ...config.slippage, ...partial } });
  };

  const updateSizing = (partial: Partial<StrategyConfig['positionSizing']>) => {
    const next = { ...config.positionSizing, ...partial };
    if (partial.rebalanceFrequency && partial.rebalanceFrequency !== 'weekly') {
      next.rebalanceWeekday = undefined;
    }
    update({ positionSizing: next });
  };

  const handleSymbolToggle = (symbol: string) => {
    const exists = config.selectedSymbols.includes(symbol);
    if (exists) {
      update({ selectedSymbols: config.selectedSymbols.filter((item) => item !== symbol) });
    } else {
      update({ selectedSymbols: [...config.selectedSymbols, symbol] });
    }
  };

  return (
    <div className="card">
      <h2>策略參數設定</h2>
      <div className="input-group">
        <label htmlFor="strategy-name">策略名稱</label>
        <input
          id="strategy-name"
          type="text"
          value={config.strategyName}
          onChange={(event) => update({ strategyName: event.target.value })}
        />
      </div>

      <div className="input-group">
        <label htmlFor="strategy-type">策略類型</label>
        <select
          id="strategy-type"
          value={config.strategyType}
          onChange={(event) => update({ strategyType: event.target.value as StrategyConfig['strategyType'] })}
        >
          <option value="dualMa">雙均線動能</option>
          <option value="rsiReversal">RSI 反轉</option>
          <option value="custom">自訂腳本</option>
        </select>
      </div>

      <section className="section-block">
        <h3>標的與資金配置</h3>
        {availableSymbols.length === 0 ? (
          <p className="muted">請先於「資料中心」匯入行情資料。</p>
        ) : (
          <div className="symbol-grid" role="group" aria-label="選擇回測標的">
            {availableSymbols.map((symbol) => (
              <label key={symbol} className="symbol-pill">
                <input
                  type="checkbox"
                  checked={config.selectedSymbols.includes(symbol)}
                  onChange={() => handleSymbolToggle(symbol)}
                />
                <span>{symbol}</span>
              </label>
            ))}
          </div>
        )}

        <div className="content-grid compact">
          <div className="input-group">
            <label htmlFor="initial-capital">初始資金 (新台幣)</label>
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
            <label htmlFor="position-mode">部位配置模式</label>
            <select
              id="position-mode"
              value={config.positionSizing.mode}
              onChange={(event) => updateSizing({ mode: event.target.value as PositionSizingMode })}
            >
              <option value="fixed">{POSITION_MODE_LABEL.fixed}</option>
              <option value="percent">{POSITION_MODE_LABEL.percent}</option>
              <option value="volatility">{POSITION_MODE_LABEL.volatility}</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="position-value">
              {config.positionSizing.mode === 'fixed'
                ? '每次下單金額'
                : config.positionSizing.mode === 'percent'
                ? '單筆資金占比'
                : '風險資金占比'}
            </label>
            <input
              id="position-value"
              type="number"
              min={config.positionSizing.mode === 'percent' || config.positionSizing.mode === 'volatility' ? 0.01 : 1000}
              step={config.positionSizing.mode === 'percent' || config.positionSizing.mode === 'volatility' ? 0.01 : 1000}
              value={config.positionSizing.value}
              onChange={(event) => updateSizing({ value: Number(event.target.value) })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="max-positions">最大同時持倉數</label>
            <input
              id="max-positions"
              type="number"
              min={1}
              value={config.positionSizing.maxPositions}
              onChange={(event) => updateSizing({ maxPositions: Number(event.target.value) })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="rebalance-frequency">再平衡頻率</label>
            <select
              id="rebalance-frequency"
              value={config.positionSizing.rebalanceFrequency}
              onChange={(event) => updateSizing({ rebalanceFrequency: event.target.value as StrategyConfig['positionSizing']['rebalanceFrequency'] })}
            >
              <option value="daily">每日</option>
              <option value="weekly">每週</option>
              <option value="monthly">每月</option>
            </select>
          </div>
          {config.positionSizing.rebalanceFrequency === 'weekly' && (
            <div className="input-group">
              <label htmlFor="rebalance-weekday">再平衡星期 (1-5)</label>
              <input
                id="rebalance-weekday"
                type="number"
                min={1}
                max={5}
                value={config.positionSizing.rebalanceWeekday ?? 5}
                onChange={(event) => updateSizing({ rebalanceWeekday: Number(event.target.value) })}
              />
            </div>
          )}
        </div>
      </section>

      <section className="section-block">
        <h3>指標參數</h3>
        <div className="content-grid compact">
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
          <div className="input-group checkbox">
            <label htmlFor="enable-rsi">
              <input
                id="enable-rsi"
                type="checkbox"
                checked={config.enableRsiFilter}
                onChange={(event) => update({ enableRsiFilter: event.target.checked })}
              />
              啟用 RSI 輔助過濾
            </label>
          </div>
        </div>
      </section>

      <section className="section-block">
        <h3>交易成本與滑點</h3>
        <div className="content-grid compact">
          <div className="input-group">
            <label htmlFor="fee-rate">總手續費率</label>
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
            <label htmlFor="commission-rate">券商佣金比例</label>
            <input
              id="commission-rate"
              type="number"
              min={0}
              step={0.0001}
              value={config.commissionRate}
              onChange={(event) => update({ commissionRate: Number(event.target.value) })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="min-commission">單筆最低手續費</label>
            <input
              id="min-commission"
              type="number"
              min={0}
              step={0.1}
              value={config.minCommission}
              onChange={(event) => update({ minCommission: Number(event.target.value) })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="stamp-tax">賣出印花稅率</label>
            <input
              id="stamp-tax"
              type="number"
              min={0}
              step={0.0001}
              value={config.stampTaxRate}
              onChange={(event) => update({ stampTaxRate: Number(event.target.value) })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="flow-fee">流量費 (人民幣)</label>
            <input
              id="flow-fee"
              type="number"
              min={0}
              step={0.01}
              value={config.flowFee}
              onChange={(event) => update({ flowFee: Number(event.target.value) })}
            />
          </div>
        </div>

        <div className="content-grid compact">
          <div className="input-group">
            <label htmlFor="slippage-mode">滑點計算方式</label>
            <select
              id="slippage-mode"
              value={config.slippage.mode}
              onChange={(event) => updateSlippage({ mode: event.target.value as 'tick' | 'ratio' })}
            >
              <option value="ratio">百分比</option>
              <option value="tick">最小跳動</option>
            </select>
          </div>
          {config.slippage.mode === 'ratio' ? (
            <div className="input-group">
              <label htmlFor="slippage-ratio">滑點比例</label>
              <input
                id="slippage-ratio"
                type="number"
                min={0}
                step={0.0001}
                value={config.slippage.ratio}
                onChange={(event) => updateSlippage({ ratio: Number(event.target.value) })}
              />
            </div>
          ) : (
            <>
              <div className="input-group">
                <label htmlFor="tick-size">最小跳動單位</label>
                <input
                  id="tick-size"
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={config.slippage.tickSize}
                  onChange={(event) => updateSlippage({ tickSize: Number(event.target.value) })}
                />
              </div>
              <div className="input-group">
                <label htmlFor="tick-count">滑點跳數</label>
                <input
                  id="tick-count"
                  type="number"
                  min={0}
                  step={1}
                  value={config.slippage.tickCount}
                  onChange={(event) => updateSlippage({ tickCount: Number(event.target.value) })}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {config.strategyType === 'custom' && (
        <section className="section-block">
          <h3>自訂策略腳本</h3>
          <p className="muted">
            以 JavaScript 編寫函式內容，使用 <code>return &#123; action: 'buy' | 'sell' | 'hold', size?: number &#125;</code> 控制交易。
            可透過 <code>ctx</code> 物件取得 {`{ symbol, index, bar, history, indicators, portfolio }`}。
          </p>
          <div className="input-group">
            <textarea
              rows={10}
              value={config.customLogic ?? ''}
              onChange={(event) => update({ customLogic: event.target.value })}
            />
          </div>
        </section>
      )}

      <div className="input-group">
        <label htmlFor="notes">備註</label>
        <textarea
          id="notes"
          rows={3}
          value={config.notes ?? ''}
          onChange={(event) => update({ notes: event.target.value })}
          placeholder="可記錄策略假設、資料來源或排程備忘。"
        />
      </div>

      <button className="button" onClick={onRun} disabled={disabled || running}>
        {running ? '回測執行中...' : '🚀 執行回測'}
      </button>
    </div>
  );
}
