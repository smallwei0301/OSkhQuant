import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StockListItem } from '../types';
import { fetchTwseListedCompanies } from '../utils/twse';

const ALL_INDUSTRY = 'ALL';

export function StockListExplorer() {
  const [items, setItems] = useState<StockListItem[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>(ALL_INDUSTRY);
  const [status, setStatus] = useState<string>('連線至臺灣證券交易所 OpenAPI...');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadCompanies = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setStatus('正在取得最新上市公司名單...');
      setError(null);
      try {
        const { companies, updatedAt } = await fetchTwseListedCompanies(signal);
        setItems(companies);
        setLastUpdated(updatedAt ?? '');
        setStatus(`臺灣上市公司共 ${companies.length} 檔`);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message = err instanceof Error ? err.message : '無法自 OpenAPI 取得資料';
        setError(message);
        setStatus('讀取失敗，請稍後再試');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    loadCompanies(controller.signal);
    return () => controller.abort();
  }, [loadCompanies]);

  const industries = useMemo(() => {
    const unique = new Set<string>();
    for (const item of items) {
      if (item.industry) {
        unique.add(item.industry);
      }
    }
    return [ALL_INDUSTRY, ...Array.from(unique).sort((a, b) => a.localeCompare(b, 'zh-Hant'))];
  }, [items]);

  const filteredItems = useMemo(() => {
    const keywordNormalized = keyword.trim().toLowerCase();
    return items.filter((item) => {
      const industryMatched =
        selectedIndustry === ALL_INDUSTRY || (item.industry ?? '') === selectedIndustry;
      if (!industryMatched) {
        return false;
      }
      if (!keywordNormalized) {
        return true;
      }
      const codeMatched = item.code.toLowerCase().includes(keywordNormalized);
      const nameMatched = item.name.toLowerCase().includes(keywordNormalized);
      const isinMatched = (item.isin ?? '').toLowerCase().includes(keywordNormalized);
      return codeMatched || nameMatched || isinMatched;
    });
  }, [items, keyword, selectedIndustry]);

  return (
    <div className="card">
      <h2>股票池管理</h2>
      <p className="status-banner">
        清單資料直接串接臺灣證券交易所 OpenAPI，確保上市公司代號與產業分類即時同步。
      </p>
      <div className="content-grid compact" style={{ alignItems: 'flex-end' }}>
        <div className="input-group">
          <label htmlFor="industry-filter">選擇產業別</label>
          <select
            id="industry-filter"
            value={selectedIndustry}
            onChange={(event) => setSelectedIndustry(event.target.value)}
            disabled={isLoading || industries.length <= 1}
          >
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry === ALL_INDUSTRY ? '全部產業' : industry}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="keyword">搜尋股票代碼 / 名稱 / ISIN</label>
          <input
            id="keyword"
            type="search"
            placeholder="輸入代碼或關鍵字"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="link-button"
          onClick={() => loadCompanies()}
          disabled={isLoading}
          aria-label="重新整理上市公司清單"
        >
          {isLoading ? '更新中...' : '重新整理'}
        </button>
      </div>
      <p>{status}</p>
      {lastUpdated && <p className="muted">資料來源更新時間：{lastUpdated}</p>}
      {error && <p className="error-text">{error}</p>}
      <div className="table-container" style={{ maxHeight: 260 }}>
        <table>
          <thead>
            <tr>
              <th>股票代碼</th>
              <th>公司名稱</th>
              <th>產業別</th>
              <th>上市日</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.code}>
                <td>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.industry ?? '—'}</td>
                <td>{item.listingDate ?? '—'}</td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '1rem' }}>
                  找不到符合條件的上市公司。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
