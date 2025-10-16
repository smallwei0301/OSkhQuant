// Version: LBK-20240602
import { ChangeEvent, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { SectionCard } from './components/SectionCard';
import { EquityChart } from './components/EquityChart';
import { TradesTable } from './components/TradesTable';
import { parseCsv } from './lib/csv';
import { runBacktest } from './lib/backtest';
import { APP_VERSION } from './version';
import { BacktestConfig, BacktestResult, MarketDataset, StrategyId } from './lib/types';

const initialConfig: BacktestConfig = {
  strategy: 'rsi',
  initialCapital: 1000000,
  perPositionValue: 100000,
  feeRate: 0.001425,
  rsiPeriod: 14,
  rsiUpper: 70,
  rsiLower: 30,
  fastMa: 5,
  slowMa: 20
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

export default function App() {
  const [dataset, setDataset] = useState<MarketDataset | null>(null);
  const [config, setConfig] = useState<BacktestConfig>(initialConfig);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const dateRange = useMemo(() => {
    if (!dataset || dataset.dates.length === 0) {
      return null;
    }
    return {
      start: dataset.dates[0],
      end: dataset.dates[dataset.dates.length - 1]
    };
  }, [dataset]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      setIsParsing(true);
      const parsed = await parseCsv(file);
      if (parsed.symbols.length === 0) {
        toast.warn('檔案內未找到任何股票資料，請確認欄位是否完整');
        setDataset(null);
        return;
      }
      setDataset(parsed);
      setResult(null);
      toast.success(`成功讀取 ${parsed.symbols.length} 檔股票資料`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'CSV 解析失敗');
      setDataset(null);
      setResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const updateConfigField = <K extends keyof BacktestConfig>(field: K, value: BacktestConfig[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof BacktestConfig) => (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    updateConfigField(field, Number(event.target.value) as BacktestConfig[typeof field]);
  };

  const handleStrategyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    updateConfigField('strategy', event.target.value as StrategyId);
  };

  const handleRunBacktest = () => {
    if (!dataset) {
      toast.error('請先匯入含有欄位 symbol,date,open,high,low,close 的 CSV 檔案');
      return;
    }
    if (config.initialCapital <= 0 || config.perPositionValue <= 0) {
      toast.error('請輸入正確的資金配置參數');
      return;
    }
    if (config.perPositionValue > config.initialCapital) {
      toast.warn('單筆下單金額超過總資金，將自動使用最大可用現金進行下單');
    }
    setIsRunning(true);
    setTimeout(() => {
      try {
        const output = runBacktest(dataset, config);
        setResult(output);
        toast.success('回測完成');
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : '回測過程發生錯誤');
      } finally {
        setIsRunning(false);
      }
    }, 10);
  };

  return (
    <>
      <main>
        <section className="hero">
          <div className="hero__content">
            <h1>LazyBacktest 雲端量化平台</h1>
            <p>
              將原有桌面版策略計算核心移植至瀏覽器，透過 Netlify 一鍵部署，即可於任何裝置上快速執行回測、檢視交易紀錄與權益曲線。
              系統提供響應式設計與中文介面，協助團隊維護一致的使用者旅程。
            </p>
          </div>
          <div className="hero__card" role="complementary">
            <h2>上線重點</h2>
            <ul>
              <li>支援 RSI 與雙均線策略，並可自訂參數</li>
              <li>CSV 上傳，內建欄位驗證與錯誤提示</li>
              <li>權益曲線視覺化、交易紀錄表格、最大回撤等指標</li>
            </ul>
          </div>
        </section>

        <SectionCard
          title="資料上傳"
          description="請提供含有欄位 symbol,date,open,high,low,close,volume 的 CSV 檔案，系統將自動依照日期排序並建立多股票資料集。"
        >
          <div className="input-field">
            <label htmlFor="csv-upload">匯入 CSV 檔案</label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isParsing}
            />
          </div>
          {dataset && (
            <div className="dataset-summary" role="status">
              <span>股票數量：{dataset.symbols.length} 檔</span>
              {dateRange && (
                <span>
                  期間：{dateRange.start} 至 {dateRange.end}（共 {dataset.dates.length} 交易日）
                </span>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="策略參數設定"
          description="所有參數均可自訂，請依照投資人風險承受度與策略需求調整。系統預設參數僅供示意，部署前可於 Netlify 設定環境變數覆寫。"
        >
          <div className="form-grid" role="group" aria-labelledby="strategy-settings">
            <div className="input-field">
              <label htmlFor="strategy">策略類型</label>
              <select id="strategy" value={config.strategy} onChange={handleStrategyChange}>
                <option value="rsi">RSI 超買超賣</option>
                <option value="dual_ma">雙均線交叉</option>
              </select>
            </div>
            <div className="input-field">
              <label htmlFor="initialCapital">初始資金（新臺幣）</label>
              <input
                id="initialCapital"
                type="number"
                min={0}
                value={config.initialCapital}
                onChange={handleNumberChange('initialCapital')}
                placeholder="請輸入初始資金"
              />
            </div>
            <div className="input-field">
              <label htmlFor="perPositionValue">單次下單金額（新臺幣）</label>
              <input
                id="perPositionValue"
                type="number"
                min={0}
                value={config.perPositionValue}
                onChange={handleNumberChange('perPositionValue')}
                placeholder="請輸入單筆部位金額"
              />
            </div>
            <div className="input-field">
              <label htmlFor="feeRate">手續費率</label>
              <input
                id="feeRate"
                type="number"
                min={0}
                max={0.1}
                step={0.0001}
                value={config.feeRate}
                onChange={handleNumberChange('feeRate')}
                placeholder="例如 0.001425"
              />
            </div>
            {config.strategy === 'rsi' && (
              <>
                <div className="input-field">
                  <label htmlFor="rsiPeriod">RSI 週期</label>
                  <input
                    id="rsiPeriod"
                    type="number"
                    min={2}
                    value={config.rsiPeriod}
                    onChange={handleNumberChange('rsiPeriod')}
                  />
                </div>
                <div className="input-field">
                  <label htmlFor="rsiUpper">RSI 上界</label>
                  <input
                    id="rsiUpper"
                    type="number"
                    min={0}
                    max={100}
                    value={config.rsiUpper}
                    onChange={handleNumberChange('rsiUpper')}
                  />
                </div>
                <div className="input-field">
                  <label htmlFor="rsiLower">RSI 下界</label>
                  <input
                    id="rsiLower"
                    type="number"
                    min={0}
                    max={100}
                    value={config.rsiLower}
                    onChange={handleNumberChange('rsiLower')}
                  />
                </div>
              </>
            )}
            {config.strategy === 'dual_ma' && (
              <>
                <div className="input-field">
                  <label htmlFor="fastMa">快線均線長度</label>
                  <input
                    id="fastMa"
                    type="number"
                    min={1}
                    value={config.fastMa}
                    onChange={handleNumberChange('fastMa')}
                  />
                </div>
                <div className="input-field">
                  <label htmlFor="slowMa">慢線均線長度</label>
                  <input
                    id="slowMa"
                    type="number"
                    min={2}
                    value={config.slowMa}
                    onChange={handleNumberChange('slowMa')}
                  />
                </div>
              </>
            )}
          </div>
          <button className="button-primary" type="button" onClick={handleRunBacktest} disabled={isRunning || isParsing}>
            {isRunning ? '計算中...' : '執行回測'}
          </button>
        </SectionCard>

        {result && (
          <SectionCard
            title="回測結果總覽"
            description="系統會同步檢視最大回撤與勝率，協助投資人評估策略穩定性。若需進一步分析，可下載交易紀錄於 Excel 進行延伸統計。"
          >
            <div className="metrics-grid">
              <div className="metric-card">
                <span>最終資產</span>
                <strong>NT$ {formatCurrency(result.finalEquity)}</strong>
              </div>
              <div className="metric-card">
                <span>總報酬率</span>
                <strong>{formatPercent(result.totalReturn)}</strong>
              </div>
              <div className="metric-card">
                <span>年化報酬率</span>
                <strong>{formatPercent(result.annualizedReturn)}</strong>
              </div>
              <div className="metric-card">
                <span>勝率</span>
                <strong>{formatPercent(result.winRate)}</strong>
              </div>
              <div className="metric-card">
                <span>最大回撤</span>
                <strong>{formatPercent(result.maxDrawdown)}</strong>
              </div>
            </div>
            <EquityChart data={result.equityCurve} />
            <TradesTable trades={result.trades} />
          </SectionCard>
        )}

        <footer className="footer">LazyBacktest Cloud Console · 版本 {APP_VERSION}</footer>
      </main>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop closeOnClick pauseOnHover />
    </>
  );
}
