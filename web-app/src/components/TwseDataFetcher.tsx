import { useMemo, useState } from 'react';
import type { ParsedPriceSeries, TwseCompany } from '../types';
import { buildTwseSeries } from '../utils/twse';

interface TwseDataFetcherProps {
  companies: TwseCompany[];
  onLoaded: (series: ParsedPriceSeries[]) => void;
}

interface FetchState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

const TW_TZ_OFFSET = '+08:00';

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00${TW_TZ_OFFSET}`);
}

function formatForInput(date: Date): string {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 10);
}

export function TwseDataFetcher({ companies, onLoaded }: TwseDataFetcherProps) {
  const [symbol, setSymbol] = useState('2330');
  const [start, setStart] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return formatForInput(date);
  });
  const [end, setEnd] = useState(() => formatForInput(new Date()));
  const [state, setState] = useState<FetchState>({ status: 'idle', message: '尚未開始下載' });

  const companyOptions = useMemo(() => {
    if (companies.length === 0) {
      return [];
    }
    return companies.map((item) => ({
      value: item.code,
      label: `${item.code}｜${item.name}${item.industry ? `｜${item.industry}` : ''}`
    }));
  }, [companies]);

  const selectedCompany = useMemo(
    () => companies.find((item) => item.code === symbol.trim()),
    [companies, symbol]
  );

  const disabled = state.status === 'loading';

  const handleFetch = async () => {
    const normalizedSymbol = symbol.trim();
    if (!normalizedSymbol) {
      setState({ status: 'error', message: '請輸入股票代碼' });
      return;
    }
    try {
      setState({ status: 'loading', message: '向台灣證交所請求資料中…' });
      const startDate = toDate(start);
      const endDate = toDate(end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error('請選擇合法的日期區間');
      }
      if (startDate > endDate) {
        throw new Error('開始日期需早於結束日期');
      }
      const series = await buildTwseSeries(
        normalizedSymbol,
        startDate,
        endDate,
        selectedCompany?.name ? `${selectedCompany.code} ${selectedCompany.name}` : undefined
      );
      onLoaded([series]);
      setState({
        status: 'success',
        message: `已載入 ${series.symbol} ${series.records.length} 筆日線資料（${series.start.toISOString().slice(0, 10)}→${series.end
          .toISOString()
          .slice(0, 10)}）`
      });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '下載失敗，請稍後重試'
      });
    }
  };

  return (
    <div className="card">
      <h2>台灣證交所資料下載</h2>
      <p className="status-banner">
        透過台灣證券交易所 Open API 即時抓取上市公司日線行情，資料會在瀏覽器端解析，不會上傳至伺服器。
      </p>
      <div className="content-grid compact">
        <div className="input-group">
          <label htmlFor="twse-symbol">股票代碼</label>
          <input
            id="twse-symbol"
            type="text"
            list="twse-symbol-list"
            inputMode="numeric"
            placeholder="例如：2330"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            disabled={disabled}
          />
          {companyOptions.length > 0 && (
            <datalist id="twse-symbol-list">
              {companyOptions.map((option) => (
                <option key={option.value} value={option.value} label={option.label} />
              ))}
            </datalist>
          )}
        </div>
        <div className="input-group">
          <label htmlFor="twse-start">開始日期</label>
          <input
            id="twse-start"
            type="date"
            value={start}
            max={end}
            onChange={(event) => setStart(event.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="input-group">
          <label htmlFor="twse-end">結束日期</label>
          <input
            id="twse-end"
            type="date"
            value={end}
            min={start}
            onChange={(event) => setEnd(event.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="twse-action-row">
        <button type="button" className="button" onClick={handleFetch} disabled={disabled}>
          {disabled ? '下載中…' : '下載並加入資料集'}
        </button>
        {selectedCompany && (
          <span className="badge">
            {selectedCompany.name}
            {selectedCompany.industry ? `｜${selectedCompany.industry}` : ''}
          </span>
        )}
      </div>
      <p className={`twse-status twse-status-${state.status}`}>{state.message}</p>
    </div>
  );
}
