import { useMemo, useState } from 'react';
import type { TwseCompany } from '../types';

interface StockListExplorerProps {
  companies: TwseCompany[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
}

const DEFAULT_INDUSTRY = '全部';

export function StockListExplorer({ companies, loading, error, onReload }: StockListExplorerProps) {
  const [keyword, setKeyword] = useState('');
  const [industry, setIndustry] = useState<string>(DEFAULT_INDUSTRY);

  const industries = useMemo(() => {
    const unique = new Set<string>();
    for (const item of companies) {
      if (item.industry && item.industry.trim()) {
        unique.add(item.industry.trim());
      }
    }
    return [DEFAULT_INDUSTRY, ...Array.from(unique).sort((a, b) => a.localeCompare(b, 'zh-TW'))];
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();
    return companies.filter((item) => {
      if (industry !== DEFAULT_INDUSTRY && item.industry !== industry) {
        return false;
      }
      if (!lowerKeyword) {
        return true;
      }
      const haystack = `${item.code} ${item.name} ${item.fullName ?? ''}`.toLowerCase();
      return haystack.includes(lowerKeyword);
    });
  }, [companies, industry, keyword]);

  const statusMessage = loading
    ? '載入台灣上市公司名錄中…'
    : error
    ? `載入失敗：${error}`
    : `共 ${companies.length.toLocaleString()} 檔，符合篩選 ${filteredCompanies.length.toLocaleString()} 檔`;

  return (
    <div className="card">
      <h2>上市公司選單</h2>
      <p className="muted">
        資料來源：台灣證券交易所 Open API，覆蓋所有上市公司、產業別、上市日期等欄位，可搭配右側搜尋與篩選快速定位標的。
      </p>
      <div className="twse-toolbar">
        <div className="input-group">
          <label htmlFor="industry-filter">產業別</label>
          <select
            id="industry-filter"
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            disabled={loading}
          >
            {industries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="keyword">搜尋代碼或名稱</label>
          <input
            id="keyword"
            type="search"
            placeholder="輸入股票代碼、公司名或關鍵字"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            disabled={loading}
          />
        </div>
        <button type="button" className="link-button" onClick={onReload} disabled={loading}>
          🔄 重新整理
        </button>
      </div>
      <p className={`twse-status twse-status-${loading ? 'loading' : error ? 'error' : 'success'}`}>
        {statusMessage}
      </p>
      <div className="table-container" style={{ maxHeight: 280 }}>
        <table>
          <thead>
            <tr>
              <th>股票代碼</th>
              <th>公司名稱</th>
              <th>產業別</th>
              <th>上市日期</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.map((item) => (
              <tr key={item.code}>
                <td>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.industry ?? '-'}</td>
                <td>{item.listingDate ?? '-'}</td>
              </tr>
            ))}
            {filteredCompanies.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  {loading ? '載入中…' : '目前條件下無符合的上市公司'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
