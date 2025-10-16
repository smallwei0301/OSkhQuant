import { useEffect, useMemo, useState } from 'react';
import type { StockListItem, StockListMeta } from '../types';
import { parseStockListCsv } from '../utils/csv';

export function StockListExplorer() {
  const [lists, setLists] = useState<StockListMeta[]>([]);
  const [selectedList, setSelectedList] = useState<string>('');
  const [items, setItems] = useState<StockListItem[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [status, setStatus] = useState<string>('請選擇股票清單');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/stock-lists/index.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('無法載入股票清單列表');
        }
        return response.json();
      })
      .then((data: StockListMeta[]) => {
        setLists(data);
        if (data.length > 0) {
          setSelectedList(data[0].id);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '讀取失敗');
      });
  }, []);

  useEffect(() => {
    const meta = lists.find((item) => item.id === selectedList);
    if (!meta) {
      return;
    }
    setStatus('載入中...');
    parseStockListCsv(`/stock-lists/${meta.file}`)
      .then((data) => {
        setItems(data);
        setStatus(`共 ${data.length} 檔`);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '讀取失敗');
        setStatus('讀取失敗');
      });
  }, [selectedList, lists]);

  const filteredItems = useMemo(() => {
    if (!keyword) {
      return items;
    }
    const lower = keyword.toLowerCase();
    return items.filter((item) =>
      item.code.toLowerCase().includes(lower) || item.name.toLowerCase().includes(lower)
    );
  }, [items, keyword]);

  return (
    <div className="card">
      <h2>股票池管理</h2>
      <div className="input-group">
        <label htmlFor="stock-list">選擇官方清單</label>
        <select
          id="stock-list"
          value={selectedList}
          onChange={(event) => setSelectedList(event.target.value)}
        >
          {lists.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="input-group">
        <label htmlFor="keyword">搜尋股票代碼或名稱</label>
        <input
          id="keyword"
          type="search"
          placeholder="輸入代碼或關鍵字"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>
      <p>{status}</p>
      {error && <p style={{ color: '#fca5a5' }}>{error}</p>}
      <div className="table-container" style={{ maxHeight: 260 }}>
        <table>
          <thead>
            <tr>
              <th>股票代碼</th>
              <th>股票名稱</th>
              <th>交易所</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.code}>
                <td>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.exchange ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
