import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StockListItem } from '../types';
import { fetchTwseListings } from '../utils/twse';

interface IndustryOption {
  value: string;
  label: string;
  count: number;
}

const INDUSTRY_ALL = 'ALL';
const INDUSTRY_UNCLASSIFIED = 'UNCLASSIFIED';

export function StockListExplorer() {
  const [items, setItems] = useState<StockListItem[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>(INDUSTRY_ALL);
  const [keyword, setKeyword] = useState<string>('');
  const [status, setStatus] = useState<string>('尚未載入資料');
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reloadToken, setReloadToken] = useState<number>(0);

  const loadData = useCallback(() => {
    setReloadToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setStatus('正在向台灣證交所 OpenAPI 取得上市公司資料...');

    fetchTwseListings({ signal: controller.signal })
      .then(({ items: fetchedItems, fetchedAt }) => {
        if (!isMounted) {
          return;
        }
        setItems(fetchedItems);
        setLastFetchedAt(fetchedAt);
        setStatus(`共 ${fetchedItems.length} 檔上市公司`);
      })
      .catch((err) => {
        if (!isMounted || err?.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : '載入失敗，請檢查網路連線。');
        setStatus('讀取失敗');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [reloadToken]);

  const industries = useMemo<IndustryOption[]>(() => {
    if (items.length === 0) {
      return [{ value: INDUSTRY_ALL, label: '全部產業', count: 0 }];
    }
    const counter = new Map<string, number>();
    for (const item of items) {
      const key = item.industry ?? INDUSTRY_UNCLASSIFIED;
      counter.set(key, (counter.get(key) ?? 0) + 1);
    }
    const options: IndustryOption[] = Array.from(counter.entries())
      .map(([value, count]) => ({
        value,
        count,
        label: value === INDUSTRY_UNCLASSIFIED ? '未分類產業' : value
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
    return [
      { value: INDUSTRY_ALL, label: '全部產業', count: items.length },
      ...options
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    const keywordLower = keyword.trim().toLowerCase();
    return items.filter((item) => {
      const industryKey = item.industry ?? INDUSTRY_UNCLASSIFIED;
      if (selectedIndustry !== INDUSTRY_ALL && industryKey !== selectedIndustry) {
        return false;
      }
      if (!keywordLower) {
        return true;
      }
      return (
        item.code.toLowerCase().includes(keywordLower) ||
        item.name.toLowerCase().includes(keywordLower) ||
        (item.industry?.toLowerCase().includes(keywordLower) ?? false)
      );
    });
  }, [items, keyword, selectedIndustry]);

  const formatFetchedTime = useCallback((value: string | null) => {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat('zh-TW', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'Asia/Taipei'
    }).format(date);
  }, []);

  return (
    <div className="card">
      <h2>股票池管理</h2>
      <p className="status-banner">
        即時從台灣證交所 OpenAPI 擷取上市公司資料，支援依產業別與關鍵字檢索，方便規劃策略股票池。
      </p>
      <div className="content-grid compact">
        <div className="input-group">
          <label htmlFor="industry-filter">篩選產業別</label>
          <select
            id="industry-filter"
            value={selectedIndustry}
            onChange={(event) => setSelectedIndustry(event.target.value)}
            disabled={items.length === 0}
          >
            {industries.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}（{option.count}）
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="keyword">搜尋股票代碼 / 名稱 / 產業</label>
          <input
            id="keyword"
            type="search"
            placeholder="輸入關鍵字"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="reload">資料狀態</label>
          <div className="inline-controls">
            <span>{status}</span>
            <button type="button" className="link-button" onClick={loadData} disabled={isLoading}>
              {isLoading ? '更新中...' : '重新整理'}
            </button>
          </div>
        </div>
      </div>
      {lastFetchedAt && (
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          最近更新時間：{formatFetchedTime(lastFetchedAt)}
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
      <div className="table-container" style={{ maxHeight: 260 }}>
        <table>
          <thead>
            <tr>
              <th>股票代碼</th>
              <th>股票名稱</th>
              <th>產業別</th>
              <th>上市日期</th>
              <th>市場別</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.code}>
                <td>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.industry ?? '未分類'}</td>
                <td>{item.listingDate ?? '-'}</td>
                <td>{item.exchange ?? 'TWSE'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && !isLoading && (
          <div className="empty-state">查無符合條件的上市公司，請調整篩選條件。</div>
        )}
        {isLoading && <div className="loading-state">資料載入中...</div>}
      </div>
      <p className="muted" style={{ marginTop: '0.75rem' }}>
        資料來源：<a href="https://openapi.twse.com.tw/" target="_blank" rel="noreferrer">台灣證券交易所 OpenAPI</a>
      </p>
    </div>
  );
}
