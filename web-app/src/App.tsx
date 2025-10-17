import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataUploader } from './components/DataUploader';
import { StrategyConfigurator } from './components/StrategyConfigurator';
import { DataPreview } from './components/DataPreview';
import { StockListExplorer } from './components/StockListExplorer';
import { EquityChart } from './components/EquityChart';
import { MetricsBoard } from './components/MetricsBoard';
import { TradeTable } from './components/TradeTable';
import { RiskConfigurator } from './components/RiskConfigurator';
import { BacktestConsole } from './components/BacktestConsole';
import { SchedulerBoard } from './components/SchedulerBoard';
import { TwseDataFetcher } from './components/TwseDataFetcher';
import type {
  BacktestResult,
  ParsedPriceSeries,
  PriceRecord,
  SchedulerPlan,
  StrategyConfig,
  TwseCompany,
  UploadedDatasetSummary
} from './types';
import { runBacktest } from './utils/backtest';
import { fetchTwseCompanies } from './utils/twse';

const BUILD_VERSION = 'LBK-NETLIFY-V9';

const DEFAULT_CONFIG: StrategyConfig = {
  versionCode: BUILD_VERSION,
  strategyId: 'lazybacktest-default',
  strategyName: 'Lazybacktest 雙均線策略',
  strategyType: 'dualMa',
  selectedSymbols: [],
  fastPeriod: 5,
  slowPeriod: 20,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  enableRsiFilter: false,
  initialCapital: 1_000_000,
  feeRate: 0.0005,
  minCommission: 5,
  commissionRate: 0.0003,
  stampTaxRate: 0.001,
  flowFee: 0.1,
  slippage: {
    mode: 'ratio',
    tickSize: 0.01,
    tickCount: 2,
    ratio: 0.001
  },
  positionSizing: {
    mode: 'percent',
    value: 0.2,
    maxPositions: 4,
    rebalanceFrequency: 'daily'
  },
  risk: {
    maxDrawdownPct: 0.2,
    maxExposurePct: 0.9,
    maxDailyLossPct: 0.05,
    stopLossPct: 0.08,
    takeProfitPct: 0.15,
    trailingStopPct: 0.05
  },
  tradingSession: {
    start: '09:00',
    end: '13:30'
  },
  timezone: 'Asia/Taipei',
  allowOvernight: true,
  customLogic: `// ctx: { symbol, index, bar, history, indicators, portfolio }
// return { action: 'buy' | 'sell' | 'hold', size?: number }
return { action: 'hold' };`,
  notes: ''
};

const NAV_TABS: { key: TabKey; label: string; description: string }[] = [
  { key: 'data', label: '資料中心', description: '管理行情資料、檢視券商匯出內容' },
  { key: 'strategy', label: '策略設定', description: '調整指標、部位與交易成本' },
  { key: 'risk', label: '風控參數', description: '配置回測風險界限與停損機制' },
  { key: 'results', label: '回測結果', description: '檢視績效指標、交易紀錄與權益曲線' },
  { key: 'scheduler', label: '排程管理', description: '規劃 Netlify Edge Function 排程' }
];

type TabKey = 'data' | 'strategy' | 'risk' | 'results' | 'scheduler';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('data');
  const [datasets, setDatasets] = useState<Record<string, PriceRecord[]>>({});
  const [summaries, setSummaries] = useState<UploadedDatasetSummary[]>([]);
  const [config, setConfig] = useState<StrategyConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [schedulerPlans, setSchedulerPlans] = useState<SchedulerPlan[]>([]);
  const [twseCompanies, setTwseCompanies] = useState<TwseCompany[]>([]);
  const [companyStatus, setCompanyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [companyError, setCompanyError] = useState<string | null>(null);

  const availableSymbols = useMemo(
    () => Object.keys(datasets).sort(),
    [datasets]
  );

  const loadTwseCompanies = useCallback(async () => {
    setCompanyStatus('loading');
    setCompanyError(null);
    try {
      const data = await fetchTwseCompanies();
      setTwseCompanies(data);
      setCompanyStatus('success');
    } catch (error) {
      setCompanyError(error instanceof Error ? error.message : '載入上市公司名錄失敗');
      setCompanyStatus('error');
    }
  }, []);

  useEffect(() => {
    loadTwseCompanies().catch((err) => {
      console.error('初始化台灣證交所名錄失敗', err);
    });
  }, [loadTwseCompanies]);

  const handleDataLoaded = useCallback((seriesList: ParsedPriceSeries[]) => {
    setDatasets((prev) => {
      const next: Record<string, PriceRecord[]> = { ...prev };
      for (const series of seriesList) {
        next[series.symbol] = series.records;
      }
      return next;
    });

    setSummaries((prev) => {
      const next = [...prev];
      for (const series of seriesList) {
        const summary: UploadedDatasetSummary = {
          symbol: series.symbol,
          name: series.sourceName,
          start: series.start.toISOString().slice(0, 10),
          end: series.end.toISOString().slice(0, 10),
          rowCount: series.records.length,
          frequency: series.frequency
        };
        const existingIndex = next.findIndex((item) => item.symbol === series.symbol);
        if (existingIndex >= 0) {
          next[existingIndex] = summary;
        } else {
          next.push(summary);
        }
      }
      next.sort((a, b) => a.symbol.localeCompare(b.symbol));
      return next;
    });

    setConfig((prev) => ({
      ...prev,
      versionCode: BUILD_VERSION,
      selectedSymbols: Array.from(new Set([...prev.selectedSymbols, ...seriesList.map((item) => item.symbol)]))
    }));

    setRunError(null);
    setResult(null);
  }, []);

  const handleRemoveDataset = useCallback((symbol: string) => {
    setDatasets((prev) => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
    setSummaries((prev) => prev.filter((item) => item.symbol !== symbol));
    setConfig((prev) => ({
      ...prev,
      selectedSymbols: prev.selectedSymbols.filter((code) => code !== symbol)
    }));
  }, []);

  const handleResetDatasets = useCallback(() => {
    setDatasets({});
    setSummaries([]);
    setResult(null);
    setRunError(null);
    setConfig((prev) => ({ ...prev, selectedSymbols: [] }));
  }, []);

  const handleRunBacktest = useCallback(() => {
    if (Object.keys(datasets).length === 0) {
      setRunError('請先匯入至少一組行情資料。');
      setActiveTab('data');
      return;
    }

    const symbols = config.selectedSymbols.filter((symbol) => Boolean(datasets[symbol]));
    if (symbols.length === 0) {
      setRunError('策略未選擇有效標的，請勾選要回測的股票或指數。');
      setActiveTab('strategy');
      return;
    }

    try {
      setIsRunning(true);
      const resultPayload = runBacktest(
        datasets,
        { ...config, selectedSymbols: symbols, versionCode: BUILD_VERSION },
        summaries
      );
      setResult(resultPayload);
      setRunError(null);
      setActiveTab('results');
    } catch (error) {
      setRunError(error instanceof Error ? error.message : '回測失敗，請稍後再試。');
    } finally {
      setIsRunning(false);
    }
  }, [config, datasets, summaries]);

  const handleSchedulerChange = useCallback((plans: SchedulerPlan[]) => {
    setSchedulerPlans(plans);
  }, []);

  const sectionTitle = useMemo(() => NAV_TABS.find((tab) => tab.key === activeTab), [activeTab]);

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-meta">
          <div>
            <h1>Lazybacktest 雲端回測中心</h1>
            <p>
              Netlify 靜態部署即上線，涵蓋資料管理、策略設定、風險控管與排程模擬，維持桌面版 KHQuant 的功能完整性，
              並整合台灣證券交易所 Open API 提供上市公司名錄與日線資料，確保行動裝置族也能完整操作。
            </p>
          </div>
          <div className="version-badge" aria-label="版本編號">
            <span>版本</span>
            <strong>{BUILD_VERSION}</strong>
          </div>
        </div>
        <nav className="tab-nav" aria-label="主功能導覽">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={tab.key === activeTab ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.label}</span>
              <small>{tab.description}</small>
            </button>
          ))}
        </nav>
        {sectionTitle && (
          <div className="section-hint">
            <h2>{sectionTitle.label}</h2>
            <p>{sectionTitle.description}</p>
          </div>
        )}
      </header>

      <main className="main-content">
        {activeTab === 'data' && (
          <>
            <div className="content-grid">
              <TwseDataFetcher companies={twseCompanies} onLoaded={handleDataLoaded} />
              <DataUploader
                datasets={summaries}
                onLoaded={handleDataLoaded}
                onRemove={handleRemoveDataset}
                onReset={handleResetDatasets}
              />
            </div>
            <StockListExplorer
              companies={twseCompanies}
              loading={companyStatus === 'loading' || companyStatus === 'idle'}
              error={companyStatus === 'error' ? companyError ?? '未知錯誤' : null}
              onReload={loadTwseCompanies}
            />
            <DataPreview datasets={datasets} summaries={summaries} />
          </>
        )}

        {activeTab === 'strategy' && (
          <div className="content-grid vertical">
            {runError && <p className="error-text">{runError}</p>}
            <StrategyConfigurator
              config={config}
              onChange={setConfig}
              onRun={handleRunBacktest}
              availableSymbols={availableSymbols}
              disabled={availableSymbols.length === 0}
              running={isRunning}
            />
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="content-grid vertical">
            {runError && <p className="error-text">{runError}</p>}
            <RiskConfigurator config={config} onChange={setConfig} />
          </div>
        )}

        {activeTab === 'results' && (
          <div className="results-layout">
            {runError && <p className="error-text">{runError}</p>}
            <div className="content-grid">
              <div className="card">
                <h3>績效摘要</h3>
                <MetricsBoard metrics={result?.metrics ?? null} />
              </div>
              <div className="card">
                <h3>權益曲線與曝險</h3>
                <EquityChart data={result?.equityCurve ?? []} />
              </div>
            </div>
            <div className="content-grid">
              <BacktestConsole logs={result?.logs ?? []} alerts={result?.riskAlerts ?? []} />
              <div className="card">
                <h3>倉位快照</h3>
                <DataPreview
                  datasets={datasets}
                  summaries={result?.datasetCoverage ?? summaries}
                  snapshots={result?.snapshots ?? []}
                />
              </div>
            </div>
            <div className="card">
              <h3>交易紀錄</h3>
              <TradeTable trades={result?.trades ?? []} />
            </div>
          </div>
        )}

        {activeTab === 'scheduler' && (
          <SchedulerBoard
            plans={schedulerPlans}
            onChange={handleSchedulerChange}
            strategyName={config.strategyName}
            availableStrategies={[{ id: config.strategyId, name: config.strategyName }]}
          />
        )}
      </main>

      <footer>
        <span>Lazybacktest © {new Date().getFullYear()} ｜ Netlify Ready ｜ {BUILD_VERSION}</span>
        <span>資料僅在瀏覽器端計算，符合台灣個資法規與券商保密要求。</span>
      </footer>
    </div>
  );
}
