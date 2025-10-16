import { useCallback, useMemo, useState } from 'react';
import { DataUploader } from './components/DataUploader';
import { StrategyConfigurator } from './components/StrategyConfigurator';
import { DataPreview } from './components/DataPreview';
import { StockListExplorer } from './components/StockListExplorer';
import { EquityChart } from './components/EquityChart';
import { MetricsBoard } from './components/MetricsBoard';
import { TradeTable } from './components/TradeTable';
import type { BacktestResult, PriceRecord, StrategyConfig } from './types';
import { runBacktest } from './utils/backtest';

const DEFAULT_CONFIG: StrategyConfig = {
  fastPeriod: 5,
  slowPeriod: 20,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  enableRsiFilter: false,
  initialCapital: 1_000_000,
  feeRate: 0.0005
};

export default function App() {
  const [priceData, setPriceData] = useState<PriceRecord[]>([]);
  const [config, setConfig] = useState<StrategyConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const handleUpload = useCallback((records: PriceRecord[]) => {
    setPriceData(records);
    setResult(null);
  }, []);

  const handleRunBacktest = useCallback(() => {
    try {
      const output = runBacktest(priceData, config);
      setResult(output);
      setRunError(null);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : '回測失敗，請稍後再試。');
    }
  }, [priceData, config]);

  const trades = result?.trades ?? [];

  const latestMetrics = useMemo(() => result?.metrics ?? null, [result]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>Lazybacktest 雲端回測中心</h1>
        <p>
          為高流量環境優化的瀏覽器回測工具，支援即時匯入券商 CSV、雙均線 + RSI 篩選策略設定、全站響應式
          UI 與權益曲線視覺化。部署至 Netlify 後即可提供 24/7 的雲端運行體驗。
        </p>
      </header>

      <div className="content-grid">
        <DataUploader onLoaded={handleUpload} />
        <StrategyConfigurator
          config={config}
          onChange={setConfig}
          onRun={handleRunBacktest}
          disabled={priceData.length === 0}
        />
      </div>

      {runError && <p style={{ color: '#fca5a5' }}>{runError}</p>}

      <div className="content-grid">
        <div className="card">
          <h2>回測績效摘要</h2>
          <MetricsBoard metrics={latestMetrics} />
        </div>
        <div className="card">
          <h2>權益曲線</h2>
          <EquityChart data={result?.equityCurve ?? []} />
        </div>
      </div>

      <div className="content-grid">
        <div className="card">
          <h2>資料預覽</h2>
          <DataPreview data={priceData} />
        </div>
        <StockListExplorer />
      </div>

      <div className="card">
        <h2>交易紀錄</h2>
        <TradeTable trades={trades} />
      </div>

      <footer>
        <span>Lazybacktest © {new Date().getFullYear()} ｜ Netlify Ready</span>
        <span>
          建議使用 Chrome 或 Edge 瀏覽器。資料僅在使用者端運算，符合台灣個資法規要求。
        </span>
      </footer>
    </div>
  );
}
