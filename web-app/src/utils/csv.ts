import Papa from 'papaparse';
import type { ParsedPriceSeries, PriceRecord } from '../types';

const DATE_HEADERS = ['date', 'datetime', 'time', '日期', '时间'];
const OPEN_HEADERS = ['open', '开盘', 'open_price'];
const HIGH_HEADERS = ['high', 'high_price', '最高'];
const LOW_HEADERS = ['low', 'low_price', '最低'];
const CLOSE_HEADERS = ['close', '收盘', 'close_price', 'adj_close', '收盘价'];
const VOLUME_HEADERS = ['volume', 'vol', '成交量'];
const SYMBOL_HEADERS = ['symbol', 'ticker', '证券代码', '代码', '股票代码', '标的'];

const normalizeHeader = (header: string): string => header.toLowerCase().trim();

const resolveField = (headers: string[], candidates: string[]): string | null => {
  for (const candidate of candidates) {
    if (headers.includes(candidate)) {
      return candidate;
    }
  }
  return null;
};

const detectFrequency = (records: PriceRecord[]): 'daily' | 'intraday' | 'unknown' => {
  if (records.length < 2) {
    return 'unknown';
  }
  const diffs: number[] = [];
  for (let i = 1; i < records.length; i += 1) {
    const diff = records[i].timestamp.getTime() - records[i - 1].timestamp.getTime();
    if (diff > 0) {
      diffs.push(diff);
    }
  }
  if (diffs.length === 0) {
    return 'unknown';
  }
  diffs.sort((a, b) => a - b);
  const median = diffs[Math.floor(diffs.length / 2)];
  const oneDay = 24 * 60 * 60 * 1000;
  if (median <= oneDay / 2) {
    return 'intraday';
  }
  if (median <= oneDay * 2) {
    return 'daily';
  }
  return 'unknown';
};

const sanitizeSymbol = (raw: string, fallback: string): string => {
  const trimmed = raw?.toString().trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.replace(/\s+/g, '').replace(/[^0-9a-zA-Z._-]/g, '').toUpperCase() || fallback;
};

const parseDateValue = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    if (value > 10_000 && value < 3_000_000) {
      // Excel serial number (with 1899-12-30 offset)
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const millis = value * 24 * 60 * 60 * 1000;
      return new Date(excelEpoch.getTime() + millis);
    }
    // treat as unix timestamp (seconds)
    if (value > 1_000_000_000 && value < 10_000_000_000) {
      return new Date(value * 1000);
    }
    if (value > 10_000_000_000) {
      return new Date(value);
    }
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/[./]/g, '-').replace(/\s+/g, ' ');
    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
    // Attempt YYYYMMDD
    if (/^\d{8}$/.test(normalized)) {
      const year = Number(normalized.slice(0, 4));
      const month = Number(normalized.slice(4, 6)) - 1;
      const day = Number(normalized.slice(6, 8));
      return new Date(year, month, day);
    }
  }
  return null;
};

export async function parsePriceCsv(file: File): Promise<ParsedPriceSeries[]> {
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
        const symbolField = resolveField(headers, SYMBOL_HEADERS);

        if (!dateField || !openField || !highField || !lowField || !closeField) {
          reject(
            new Error('CSV 檔案欄位需包含日期、開盤、最高、最低、收盤欄位，請確認標題列是否正確。')
          );
          return;
        }

        const seriesMap = new Map<string, PriceRecord[]>();
        const fallbackSymbol = sanitizeSymbol(file.name.replace(/\.[^.]+$/, ''), 'DATASET');

        for (const row of results.data) {
          const dateRaw = row[rawHeaders[headers.indexOf(dateField)]];
          const openValue = Number(row[rawHeaders[headers.indexOf(openField)]]);
          const highValue = Number(row[rawHeaders[headers.indexOf(highField)]]);
          const lowValue = Number(row[rawHeaders[headers.indexOf(lowField)]]);
          const closeValue = Number(row[rawHeaders[headers.indexOf(closeField)]]);
          const volumeValue = volumeField
            ? Number(row[rawHeaders[headers.indexOf(volumeField)]])
            : 0;

          if (
            dateRaw === undefined ||
            Number.isNaN(openValue) ||
            Number.isNaN(highValue) ||
            Number.isNaN(lowValue) ||
            Number.isNaN(closeValue)
          ) {
            continue;
          }

          const parsedDate = parseDateValue(dateRaw);
          if (!parsedDate) {
            continue;
          }

          const rawSymbol = symbolField
            ? row[rawHeaders[headers.indexOf(symbolField)]]
            : undefined;
          const symbol = sanitizeSymbol(String(rawSymbol ?? ''), fallbackSymbol);

          if (!seriesMap.has(symbol)) {
            seriesMap.set(symbol, []);
          }

          seriesMap.get(symbol)!.push({
            timestamp: parsedDate,
            open: openValue,
            high: Number.isNaN(highValue) ? openValue : highValue,
            low: Number.isNaN(lowValue) ? openValue : lowValue,
            close: closeValue,
            volume: Number.isNaN(volumeValue) ? 0 : volumeValue,
            symbol
          });
        }

        if (seriesMap.size === 0) {
          reject(new Error('未能在檔案內解析出有效的行情資料。'));
          return;
        }

        const parsedSeries: ParsedPriceSeries[] = [];
        seriesMap.forEach((records, symbol) => {
          records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          const frequency = detectFrequency(records);
          const start = records[0].timestamp;
          const end = records[records.length - 1].timestamp;
          parsedSeries.push({
            symbol,
            records,
            frequency,
            sourceName: file.name,
            start,
            end
          });
        });

        resolve(parsedSeries);
      },
      error: (error) => reject(error)
    });
  });
}

