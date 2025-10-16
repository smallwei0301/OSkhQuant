import Papa from 'papaparse';
import type { PriceRecord, StockListItem } from '../types';

const DATE_HEADERS = ['date', 'datetime', 'time'];
const OPEN_HEADERS = ['open', '开盘', 'open_price'];
const HIGH_HEADERS = ['high', 'high_price', '最高'];
const LOW_HEADERS = ['low', 'low_price', '最低'];
const CLOSE_HEADERS = ['close', '收盘', 'close_price', 'adj_close'];
const VOLUME_HEADERS = ['volume', 'vol', '成交量'];

const normalizeHeader = (header: string): string => header.toLowerCase().trim();

const resolveField = (headers: string[], candidates: string[]): string | null => {
  for (const candidate of candidates) {
    if (headers.includes(candidate)) {
      return candidate;
    }
  }
  return null;
};

export async function parsePriceCsv(file: File): Promise<PriceRecord[]> {
  const text = await file.text();
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string | number | undefined>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors.map((e) => e.message).join('\n')));
          return;
        }

        const rawHeaders = results.meta.fields ?? [];
        const headers = rawHeaders.map(normalizeHeader);

        const dateField = resolveField(headers, DATE_HEADERS);
        const openField = resolveField(headers, OPEN_HEADERS);
        const highField = resolveField(headers, HIGH_HEADERS);
        const lowField = resolveField(headers, LOW_HEADERS);
        const closeField = resolveField(headers, CLOSE_HEADERS);
        const volumeField = resolveField(headers, VOLUME_HEADERS);

        if (!dateField || !openField || !highField || !lowField || !closeField) {
          reject(
            new Error(
              'CSV 檔案欄位需包含日期、開盤、最高、最低、收盤欄位，請確認標題列是否正確。'
            )
          );
          return;
        }

        const data: PriceRecord[] = [];
        for (const row of results.data) {
          const dateValue = row[rawHeaders[headers.indexOf(dateField)]];
          const openValue = Number(row[rawHeaders[headers.indexOf(openField)]]);
          const highValue = Number(row[rawHeaders[headers.indexOf(highField)]]);
          const lowValue = Number(row[rawHeaders[headers.indexOf(lowField)]]);
          const closeValue = Number(row[rawHeaders[headers.indexOf(closeField)]]);
          const volumeValue = volumeField
            ? Number(row[rawHeaders[headers.indexOf(volumeField)]])
            : 0;

          if (!dateValue || Number.isNaN(openValue) || Number.isNaN(closeValue)) {
            continue;
          }

          const timestamp = new Date(String(dateValue));
          if (Number.isNaN(timestamp.getTime())) {
            continue;
          }

          data.push({
            timestamp,
            open: openValue,
            high: Number.isNaN(highValue) ? openValue : highValue,
            low: Number.isNaN(lowValue) ? openValue : lowValue,
            close: closeValue,
            volume: Number.isNaN(volumeValue) ? 0 : volumeValue
          });
        }

        data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        resolve(data);
      },
      error: (error) => reject(error)
    });
  });
}

export async function parseStockListCsv(fileUrl: string): Promise<StockListItem[]> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`無法載入股票清單：${response.statusText}`);
  }
  const csvText = await response.text();
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors.map((e) => e.message).join('\n')));
          return;
        }
        const items: StockListItem[] = results.data
          .map((row) => {
            const code = row['代码'] || row['code'] || row['股票代码'];
            const name = row['名称'] || row['name'] || row['股票简称'];
            const exchange = row['市场'] || row['exchange'];
            if (!code || !name) {
              return null;
            }
            return {
              code: code.trim(),
              name: name.trim(),
              exchange: exchange?.trim()
            };
          })
          .filter((item): item is StockListItem => Boolean(item));
        resolve(items);
      },
      error: (error) => reject(error)
    });
  });
}
