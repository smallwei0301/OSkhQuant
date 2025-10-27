import { PRESET_STRATEGIES } from './strategies.js';

let chartInstance = null;

export function initStrategyList(currentId, onSelect) {
  const container = document.getElementById('strategy-list');
  container.innerHTML = '';
  PRESET_STRATEGIES.forEach((strategy) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `strategy-card${strategy.id === currentId ? ' active' : ''}`;
    button.innerHTML = `<h3>${strategy.name}</h3><p>${strategy.description}</p>`;
    button.addEventListener('click', () => onSelect(strategy.id));
    container.appendChild(button);
  });
}

export function updateStrategyList(currentId) {
  const container = document.getElementById('strategy-list');
  [...container.children].forEach((child, index) => {
    const strategy = PRESET_STRATEGIES[index];
    if (!strategy) return;
    if (strategy.id === currentId) child.classList.add('active');
    else child.classList.remove('active');
  });
}

export function renderParameters(strategy, values, onChange) {
  const container = document.getElementById('parameter-controls');
  container.innerHTML = '';
  strategy.parameters.forEach((param) => {
    const wrapper = document.createElement('label');
    const value = values[param.key];
    wrapper.innerHTML = `
      <span>
        <span>${param.label}</span>
        <span>${value}</span>
      </span>
      <input type="range" min="${param.min ?? 0}" max="${param.max ?? 100}" step="${param.step ?? 1}" value="${value}" />
    `;
    const input = wrapper.querySelector('input');
    input.addEventListener('input', (event) => {
      const nextValue = Number(event.target.value);
      wrapper.querySelector('span span:last-child').textContent = nextValue;
      onChange(param.key, nextValue);
    });
    container.appendChild(wrapper);
  });
}

export function showFeedback(message, type = 'info') {
  const panel = document.getElementById('feedback-panel');
  panel.hidden = false;
  panel.className = `panel feedback-panel ${type === 'error' ? 'feedback-panel--error' : ''}`;
  panel.innerHTML = `<p>${message}</p>`;
}

export function hideFeedback() {
  const panel = document.getElementById('feedback-panel');
  panel.hidden = true;
  panel.innerHTML = '';
}

export function updateDatasetStatus(symbol, frequency) {
  const status = document.getElementById('dataset-status');
  status.innerHTML = `
    <span class="header__status-title">已載入標的</span>
    <span class="header__status-value">${symbol} · ${frequency}</span>
  `;
}

export function resetDatasetStatus() {
  const status = document.getElementById('dataset-status');
  status.innerHTML = `
    <span class="header__status-title">尚未載入資料</span>
    <span class="header__status-value">請上傳 CSV</span>
  `;
}

export function renderMetrics(metrics) {
  const panel = document.getElementById('metrics-panel');
  const grid = document.getElementById('metrics-grid');
  const formatPercent = (value, fraction = 2) => `${(value * 100).toFixed(fraction)}%`;
  const items = [
    { key: 'totalReturn', label: '總報酬', value: formatPercent(metrics.totalReturn) },
    { key: 'annualReturn', label: '年化報酬', value: formatPercent(metrics.annualReturn) },
    { key: 'maxDrawdown', label: '最大回落', value: formatPercent(metrics.maxDrawdown) },
    { key: 'sharpe', label: '夏普比率', value: metrics.sharpe.toFixed(2) },
    { key: 'winRate', label: '勝率', value: formatPercent(metrics.winRate, 1) },
    { key: 'profitFactor', label: '獲利因子', value: metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2) },
    { key: 'exposure', label: '市場曝險', value: formatPercent(metrics.exposure, 1) }
  ];
  grid.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'metrics-card';
    card.innerHTML = `<span>${item.label}</span><span>${item.value}</span>`;
    grid.appendChild(card);
  });
  panel.hidden = false;
}

export function renderTrades(trades) {
  const panel = document.getElementById('trades-panel');
  const count = document.getElementById('trade-count');
  const tbody = document.querySelector('#trades-table tbody');
  count.textContent = `${trades.length} 筆`;
  tbody.innerHTML = '';
  trades.forEach((trade) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${trade.timestamp.toLocaleString('zh-TW')}</td>
      <td class="${trade.side === 'buy' ? 'badge-buy' : 'badge-sell'}">${trade.side === 'buy' ? '買進' : '賣出'}</td>
      <td>${trade.price.toLocaleString('zh-TW', { maximumFractionDigits: 2 })}</td>
      <td>${trade.quantity.toLocaleString('zh-TW')}</td>
      <td>${trade.remark || ''}</td>
    `;
    tbody.appendChild(tr);
  });
  panel.hidden = trades.length === 0;
}

export function renderEquityChart(equityCurve) {
  const panel = document.getElementById('chart-panel');
  const ctx = document.getElementById('equity-chart');
  const labels = equityCurve.map((point) => `${point.time.getFullYear()}/${point.time.getMonth() + 1}/${point.time.getDate()}`);
  const data = equityCurve.map((point) => Number(point.equity.toFixed(2)));
  if (chartInstance) {
    chartInstance.destroy();
  }
  chartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '淨值',
          data,
          fill: false,
          borderColor: '#42a5f5',
          backgroundColor: '#42a5f5',
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `淨值：$${context.parsed.y.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => `${Number(value / 10000).toFixed(0)} 萬`
          }
        }
      }
    }
  });
  panel.hidden = false;
}

export function resetResults() {
  document.getElementById('metrics-panel').hidden = true;
  document.getElementById('chart-panel').hidden = true;
  document.getElementById('trades-panel').hidden = true;
  const tbody = document.querySelector('#trades-table tbody');
  if (tbody) tbody.innerHTML = '';
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}
