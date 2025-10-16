import { PRESET_STRATEGIES, getDefaultParameters } from './strategies.js';
import { parseCsvFile } from './dataset.js';
import { runBacktest } from './backtest.js';
import {
  initStrategyList,
  updateStrategyList,
  renderParameters,
  showFeedback,
  hideFeedback,
  renderMetrics,
  renderTrades,
  renderEquityChart,
  resetResults,
  updateDatasetStatus,
  resetDatasetStatus
} from './ui.js';
import { BUILD_VERSION } from './version.js';

const state = {
  dataset: null,
  strategy: PRESET_STRATEGIES[0],
  parameters: getDefaultParameters(PRESET_STRATEGIES[0].id),
  initialCapital: 1_000_000,
  feeRate: 0.0005,
  loading: false
};

function setLoading(value) {
  state.loading = value;
  const button = document.getElementById('run-backtest');
  button.disabled = value;
  button.textContent = value ? '計算中...' : '開始回測';
}

function bindEvents() {
  const fileInput = document.getElementById('file-input');
  const selectButton = document.getElementById('select-file');
  const runButton = document.getElementById('run-backtest');
  const capitalInput = document.getElementById('initial-capital');
  const feeInput = document.getElementById('fee-rate');
  const resetButton = document.getElementById('reset-button');

  selectButton.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const parsed = await parseCsvFile(file);
      state.dataset = parsed;
      updateDatasetStatus(parsed.symbol, parsed.frequency);
      hideFeedback();
      showFeedback(`成功載入 ${parsed.rows.length} 筆資料。`, 'info');
      resetResults();
    } catch (error) {
      showFeedback(error.message || '無法解析檔案，請確認格式。', 'error');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  });

  runButton.addEventListener('click', () => {
    if (!state.dataset) {
      showFeedback('請先上傳行情資料 CSV 檔，再執行回測。', 'error');
      return;
    }
    hideFeedback();
    setLoading(true);
    try {
      const report = runBacktest(state.dataset, {
        strategy: state.strategy,
        parameters: state.parameters,
        initialCapital: state.initialCapital,
        feeRate: state.feeRate
      });
      renderMetrics(report.metrics);
      renderEquityChart(report.equityCurve);
      renderTrades(report.trades);
      showFeedback(`回測完成，共產生 ${report.trades.length} 筆交易。`, 'info');
    } catch (error) {
      showFeedback(error.message || '回測時發生未知錯誤。', 'error');
    } finally {
      setLoading(false);
    }
  });

  capitalInput.addEventListener('input', (event) => {
    state.initialCapital = Number(event.target.value) || 0;
  });

  feeInput.addEventListener('input', (event) => {
    state.feeRate = Number(event.target.value) || 0;
  });

  resetButton.addEventListener('click', () => {
    state.dataset = null;
    state.strategy = PRESET_STRATEGIES[0];
    state.parameters = getDefaultParameters(state.strategy.id);
    state.initialCapital = 1_000_000;
    state.feeRate = 0.0005;
    document.getElementById('initial-capital').value = state.initialCapital;
    document.getElementById('fee-rate').value = state.feeRate;
    resetDatasetStatus();
    initStrategyList(state.strategy.id, handleStrategySelect);
    renderParameters(state.strategy, state.parameters, handleParameterChange);
    resetResults();
    hideFeedback();
  });
}

function handleStrategySelect(strategyId) {
  const next = PRESET_STRATEGIES.find((item) => item.id === strategyId);
  if (!next) return;
  state.strategy = next;
  state.parameters = getDefaultParameters(strategyId);
  updateStrategyList(strategyId);
  renderParameters(state.strategy, state.parameters, handleParameterChange);
}

function handleParameterChange(key, value) {
  state.parameters[key] = value;
}

function init() {
  document.getElementById('build-version').textContent = BUILD_VERSION;
  initStrategyList(state.strategy.id, handleStrategySelect);
  renderParameters(state.strategy, state.parameters, handleParameterChange);
  bindEvents();
  resetResults();
}

init();
