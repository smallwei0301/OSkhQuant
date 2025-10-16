import type { BacktestLogEntry, RiskAlert } from '../types';

interface BacktestConsoleProps {
  logs: BacktestLogEntry[];
  alerts: RiskAlert[];
}

export function BacktestConsole({ logs, alerts }: BacktestConsoleProps) {
  return (
    <div className="card">
      <h3>回測日誌</h3>
      <div className="log-section" aria-live="polite">
        {alerts.length === 0 ? (
          <p className="muted">尚未觸發風控事件。</p>
        ) : (
          <ul className="log-list alerts">
            {alerts.map((alert, index) => (
              <li key={`${alert.date}-${alert.type}-${index}`} className={`alert ${alert.severity}`}>
                <span className="timestamp">{alert.date}</span>
                <span className="badge">{alert.type}</span>
                <span>{alert.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="log-section">
        {logs.length === 0 ? (
          <p className="muted">尚無系統日誌，請先執行回測。</p>
        ) : (
          <ul className="log-list">
            {logs.map((log, index) => (
              <li key={`${log.date}-${index}`} className={`log-entry ${log.level}`}>
                <span className="timestamp">{log.date}</span>
                <span>{log.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
