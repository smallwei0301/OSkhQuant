import type { StrategyConfig } from '../types';

interface RiskConfiguratorProps {
  config: StrategyConfig;
  onChange: (config: StrategyConfig) => void;
}

export function RiskConfigurator({ config, onChange }: RiskConfiguratorProps) {
  const update = (partial: Partial<StrategyConfig>) => {
    onChange({ ...config, ...partial });
  };

  const updateRisk = (partial: Partial<StrategyConfig['risk']>) => {
    update({ risk: { ...config.risk, ...partial } });
  };

  const updateSession = (partial: Partial<StrategyConfig['tradingSession']>) => {
    update({ tradingSession: { ...config.tradingSession, ...partial } });
  };

  return (
    <div className="card">
      <h2>風險控管設定</h2>
      <section className="section-block">
        <h3>權益風險界限</h3>
        <div className="content-grid compact">
          <div className="input-group">
            <label htmlFor="max-drawdown">最大回撤容忍 (%)</label>
            <input
              id="max-drawdown"
              type="number"
              min={0.01}
              max={0.9}
              step={0.01}
              value={config.risk.maxDrawdownPct}
              onChange={(event) => updateRisk({ maxDrawdownPct: Number(event.target.value) })}
            />
            <small>超過設定門檻時記錄風險告警，後續交易將暫停。</small>
          </div>
          <div className="input-group">
            <label htmlFor="max-exposure">最大曝險比例</label>
            <input
              id="max-exposure"
              type="number"
              min={0.1}
              max={1}
              step={0.05}
              value={config.risk.maxExposurePct}
              onChange={(event) => updateRisk({ maxExposurePct: Number(event.target.value) })}
            />
            <small>控制持倉總市值佔權益的上限，避免過度槓桿化。</small>
          </div>
          <div className="input-group">
            <label htmlFor="max-daily-loss">單日最大損失</label>
            <input
              id="max-daily-loss"
              type="number"
              min={0.01}
              max={0.2}
              step={0.01}
              value={config.risk.maxDailyLossPct}
              onChange={(event) => updateRisk({ maxDailyLossPct: Number(event.target.value) })}
            />
            <small>若單日虧損超過此比例，當日停止加碼。</small>
          </div>
        </div>
      </section>

      <section className="section-block">
        <h3>停損與停利</h3>
        <div className="content-grid compact">
          <div className="input-group">
            <label htmlFor="stop-loss">固定停損 (%)</label>
            <input
              id="stop-loss"
              type="number"
              min={0.01}
              max={0.5}
              step={0.01}
              value={config.risk.stopLossPct}
              onChange={(event) => updateRisk({ stopLossPct: Number(event.target.value) })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="take-profit">固定停利 (%)</label>
            <input
              id="take-profit"
              type="number"
              min={0.01}
              max={1}
              step={0.01}
              value={config.risk.takeProfitPct}
              onChange={(event) => updateRisk({ takeProfitPct: Number(event.target.value) })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="trailing-stop">移動停損 (%)</label>
            <input
              id="trailing-stop"
              type="number"
              min={0}
              max={0.5}
              step={0.01}
              value={config.risk.trailingStopPct}
              onChange={(event) => updateRisk({ trailingStopPct: Number(event.target.value) })}
            />
            <small>以進場後最高價回退比率計算，0 代表停用。</small>
          </div>
        </div>
      </section>

      <section className="section-block">
        <h3>交易時段與時區</h3>
        <div className="content-grid compact">
          <div className="input-group">
            <label htmlFor="session-start">交易時段開始</label>
            <input
              id="session-start"
              type="time"
              value={config.tradingSession.start}
              onChange={(event) => updateSession({ start: event.target.value })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="session-end">交易時段結束</label>
            <input
              id="session-end"
              type="time"
              value={config.tradingSession.end}
              onChange={(event) => updateSession({ end: event.target.value })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="timezone">時區</label>
            <input
              id="timezone"
              type="text"
              value={config.timezone}
              onChange={(event) => update({ timezone: event.target.value })}
              placeholder="例如 Asia/Taipei"
            />
          </div>
          <div className="input-group checkbox">
            <label htmlFor="allow-overnight">
              <input
                id="allow-overnight"
                type="checkbox"
                checked={config.allowOvernight}
                onChange={(event) => update({ allowOvernight: event.target.checked })}
              />
              允許隔夜持倉
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
