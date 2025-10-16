import { useEffect, useMemo, useState } from 'react';
import type { StockListItem, TwseListingRow } from '../types';

const TWSE_LISTINGS_URL = 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L';

function normalizeListing(row: TwseListingRow): StockListItem | null {
  const rawCode =
    row['公司代號'] ??
    row['證券代號'] ??
    row['股票代號'] ??
    row['Symbol'] ??
    row['stock_code'];
  const rawName =
    row['公司名稱'] ??
    row['公司簡稱'] ??
    row['證券名稱'] ??
    row['stock_name'] ??
    row['英文簡稱'];

  if (!rawCode || !rawName) {
    return null;
  }

  const exchange = row['市場別'] ?? row['market'] ?? 'TWSE';
  const industry = row['產業別'] ?? row['產業分類'] ?? row['industry'];
  const listingDate = row['上市日'] ?? row['listing_date'];
  const isin =
    row['國際證券辨識號碼'] ?? row['ISIN Code'] ?? row['isin'] ?? row['ISIN碼'] ?? undefined;

  return {
    code: rawCode.trim(),
    name: rawName.trim(),
    exchange: exchange?.trim() ?? 'TWSE',
    industry: industry?.trim(),
    listingDate: listingDate?.trim(),
    isin: isin?.trim()
  };
}

export function StockListExplorer() {
  const [items, setItems] = useState<StockListItem[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [industryFilter, setIndustryFilter] = useState<string>('全部產業');
  const [marketFilter, setMarketFilter] = useState<string>('全部市場');
  const [status, setStatus] = useState<string>('載入台灣上市公司中...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus('連線台灣證交所 OpenAPI...');
    fetch(TWSE_LISTINGS_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error('無法讀取台灣證交所上市公司資料');
        }
        return response.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) {
          throw new Error('OpenAPI 回傳格式異常');
        }
        const mapped: StockListItem[] = [];
        for (const item of data as TwseListingRow[]) {
          const normalized = normalizeListing(item);
          if (normalized) {
            mapped.push(normalized);
          }
        }
        mapped.sort((a, b) => a.code.localeCompare(b.code, 'zh-Hant'));
        setItems(mapped);
        setStatus(`已載入 ${mapped.length} 檔台灣上市公司`);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '讀取失敗');
        setStatus('無法載入上市公司資料');
      });
  }, []);

  const industries = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.industry) {
        set.add(item.industry);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [items]);

  const markets = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.exchange) {
        set.add(item.exchange);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [items]);

  const filteredItems = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();
    return items.filter((item) => {
      const matchesKeyword =
        !lowerKeyword ||
        item.code.toLowerCase().includes(lowerKeyword) ||
        item.name.toLowerCase().includes(lowerKeyword);
      const matchesIndustry =
        industryFilter === '全部產業' || item.industry === industryFilter || (!item.industry && industryFilter === '未分類');
      const matchesMarket = marketFilter === '全部市場' || item.exchange === marketFilter;
      return matchesKeyword && matchesIndustry && matchesMarket;
    });
  }, [industryFilter, items, keyword, marketFilter]);

  const filteredStatus = useMemo(() => {
    if (filteredItems.length === items.length) {
      return status;
    }
    return `篩選後共 ${filteredItems.length} 檔（總數 ${items.length} 檔）`;
  }, [filteredItems.length, items.length, status]);

  return (
    <div className="card">
      <h2>股票池管理</h2>
      <div className="grid" style={{ gap: '1rem' }}>
        <div className="input-group">
          <label htmlFor="market">市場篩選</label>
          <select
            id="market"
            value={marketFilter}
            onChange={(event) => setMarketFilter(event.target.value)}
          >
            <option value="全部市場">全部市場</option>
            {markets.map((market) => (
              <option key={market} value={market}>
                {market}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="industry">產業別</label>
          <select
            id="industry"
            value={industryFilter}
            onChange={(event) => setIndustryFilter(event.target.value)}
          >
            <option value="全部產業">全部產業</option>
            <option value="未分類">未分類</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="keyword">搜尋股票代碼或名稱</label>
          <input
            id="keyword"
            type="search"
            placeholder="輸入代碼或關鍵字"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </div>
      <p>{filteredStatus}</p>
      {error && <p style={{ color: '#fca5a5' }}>{error}</p>}
      <div className="table-container" style={{ maxHeight: 300 }}>
        <table>
          <thead>
            <tr>
              <th>股票代碼</th>
              <th>股票名稱</th>
              <th>市場別</th>
              <th>產業別</th>
              <th>上市日</th>
              <th>ISIN</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.code}>
                <td>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.exchange ?? '-'}</td>
                <td>{item.industry ?? '未分類'}</td>
                <td>{item.listingDate ?? '-'}</td>
                <td>{item.isin ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
