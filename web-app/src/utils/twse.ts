import type { ParsedPriceSeries, PriceRecord, TwseCompany } from '../types';

interface TwseRawCompany {
  [key: string]: string;
}

interface TwseDailyRow {
  [key: string]: string;
}

const COMPANY_ENDPOINT = 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L';
const DAILY_ENDPOINT = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY';

const TW_TZ_OFFSET = '+08:00';

function normalizeSeparator(value: string): string {
  return value.replace(/[.]/g, '/').replace(/-/g, '/');
}

function toGregorianYear(year: number): number {
  if (!Number.isFinite(year)) {
    return Number.NaN;
  }
  return year < 1911 ? year + 1911 : year;
}

function sanitizeNumber(value?: string | number): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === '--' || trimmed === '0') {
    return trimmed === '0' ? 0 : null;
  }
  const normalized = trimmed.replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseTwseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const separated = normalizeSeparator(trimmed);
  const parts = separated.split('/').map((item) => item.trim()).filter(Boolean);
  if (parts.length === 3) {
    const [rawYear, rawMonth, rawDay] = parts;
    const parsedYear = Number(rawYear);
    const parsedMonth = Number(rawMonth);
    const parsedDay = Number(rawDay);
    if (
      Number.isFinite(parsedYear) &&
      Number.isFinite(parsedMonth) &&
      Number.isFinite(parsedDay) &&
      parsedMonth >= 1 &&
      parsedMonth <= 12 &&
      parsedDay >= 1 &&
      parsedDay <= 31
    ) {
      const year = toGregorianYear(parsedYear);
      if (!Number.isNaN(year)) {
        const month = String(parsedMonth).padStart(2, '0');
        const day = String(parsedDay).padStart(2, '0');
        return new Date(`${year}-${month}-${day}T00:00:00${TW_TZ_OFFSET}`);
      }
    }
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 8) {
    const rawYear = Number(digitsOnly.slice(0, 4));
    const rawMonth = Number(digitsOnly.slice(4, 6));
    const rawDay = Number(digitsOnly.slice(6, 8));
    if (
      Number.isFinite(rawYear) &&
      Number.isFinite(rawMonth) &&
      Number.isFinite(rawDay) &&
      rawMonth >= 1 &&
      rawMonth <= 12 &&
      rawDay >= 1 &&
      rawDay <= 31
    ) {
      return new Date(`${rawYear}-${String(rawMonth).padStart(2, '0')}-${String(rawDay).padStart(2, '0')}T00:00:00${TW_TZ_OFFSET}`);
    }
  }

  if (digitsOnly.length === 7) {
    const rawYear = Number(digitsOnly.slice(0, 3));
    const rawMonth = Number(digitsOnly.slice(3, 5));
    const rawDay = Number(digitsOnly.slice(5, 7));
    const gregorianYear = toGregorianYear(rawYear);
    if (
      Number.isFinite(gregorianYear) &&
      Number.isFinite(rawMonth) &&
      Number.isFinite(rawDay) &&
      rawMonth >= 1 &&
      rawMonth <= 12 &&
      rawDay >= 1 &&
      rawDay <= 31
    ) {
      return new Date(`${gregorianYear}-${String(rawMonth).padStart(2, '0')}-${String(rawDay).padStart(2, '0')}T00:00:00${TW_TZ_OFFSET}`);
    }
  }

  return null;
}

export async function fetchTwseCompanies(): Promise<TwseCompany[]> {
  const response = await fetch(COMPANY_ENDPOINT, {
    headers: {
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error('無法載入台灣證交所上市公司名錄');
  }
  const payload = (await response.json()) as TwseRawCompany[];
  if (!Array.isArray(payload)) {
    throw new Error('台灣證交所回傳格式異常');
  }

  const companies: TwseCompany[] = payload
    .map((item) => {
      const code =
        item['公司代號'] || item['Code'] || item['證券代號'] || item['StockNo'] || item['stock_code'];
      const name = item['公司簡稱'] || item['公司名稱'] || item['Name'] || item['公司全名'];
      if (!code || !name) {
        return null;
      }
      return {
        code: code.trim(),
        name: name.trim(),
        fullName: (item['公司名稱'] || item['公司全名'] || item['FullName'] || '').trim() || undefined,
        industry: (item['產業別'] || item['Industry'] || item['產業分類'] || '').trim() || undefined,
        listingDate: (item['上市日期'] || item['ListingDate'] || '').trim() || undefined,
        cfiCode: (item['CFICode'] || item['國際證券辨識號'] || '').trim() || undefined
      } satisfies TwseCompany;
    })
    .filter((item): item is TwseCompany => Boolean(item))
    .sort((a, b) => a.code.localeCompare(b.code));

  return companies;
}

function pickValue(row: TwseDailyRow, keys: string[]): string | undefined {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return undefined;
}

function parseDailyRow(row: TwseDailyRow, symbol: string): PriceRecord | null {
  const dateValue = pickValue(row, ['Date', '日期', '年月日']);
  const date = parseTwseDate(dateValue);
  if (!date) {
    return null;
  }

  const open = sanitizeNumber(pickValue(row, ['Open', '開盤價', '開盤']));
  const high = sanitizeNumber(pickValue(row, ['High', '最高價', '最高']));
  const low = sanitizeNumber(pickValue(row, ['Low', '最低價', '最低']));
  const close = sanitizeNumber(pickValue(row, ['Close', '收盤價', '收盤']));
  const volume = sanitizeNumber(pickValue(row, ['TradeVolume', '成交股數', '成交量'])) ?? 0;

  if (
    open === null ||
    high === null ||
    low === null ||
    close === null ||
    Number.isNaN(open) ||
    Number.isNaN(high) ||
    Number.isNaN(low) ||
    Number.isNaN(close)
  ) {
    return null;
  }

  return {
    symbol,
    timestamp: date,
    open,
    high,
    low,
    close,
    volume
  } satisfies PriceRecord;
}

export async function fetchTwseDailySeries(
  symbol: string,
  start: Date,
  end: Date
): Promise<PriceRecord[]> {
  if (!symbol) {
    throw new Error('請輸入股票代碼');
  }
  if (start > end) {
    throw new Error('開始日期需早於結束日期');
  }

  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  const endYear = end.getFullYear();
  const endMonth = end.getMonth();

  const monthSlots: { year: number; month: number }[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const monthFrom = year === startYear ? startMonth : 0;
    const monthTo = year === endYear ? endMonth : 11;
    for (let month = monthFrom; month <= monthTo; month += 1) {
      monthSlots.push({ year, month });
    }
  }

  const collected: PriceRecord[] = [];
  for (const slot of monthSlots) {
    const dateParam = `${slot.year}${String(slot.month + 1).padStart(2, '0')}01`;
    const url = `${DAILY_ENDPOINT}?date=${dateParam}&stockNo=${encodeURIComponent(symbol)}`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
    } catch (error) {
      throw new Error(`台灣證交所連線失敗，請稍後再試（${symbol} ${slot.year}-${String(slot.month + 1).padStart(2, '0')}）`);
    }
    if (!response.ok) {
      throw new Error(`無法取得 ${symbol} 的日線資料 (${slot.year}-${String(slot.month + 1).padStart(2, '0')})`);
    }
    const payload = await response.json();
    const rows: TwseDailyRow[] = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: TwseDailyRow[] }).data)
        ? (payload as { data: TwseDailyRow[] }).data
        : Array.isArray((payload as { fields?: string[] }).fields) &&
            Array.isArray((payload as { data?: string[][] }).data)
          ? (payload as { fields: string[]; data: string[][] }).data.map((row) => {
              const record: TwseDailyRow = {};
              (payload as { fields: string[] }).fields.forEach((field, index) => {
                if (row[index] !== undefined) {
                  record[field] = row[index];
                }
              });
              return record;
            })
          : [];
    if (rows.length === 0) {
      const statMessage = typeof (payload as { stat?: string }).stat === 'string'
        ? (payload as { stat: string }).stat
        : undefined;
      if (statMessage && statMessage !== 'OK') {
        throw new Error(`${symbol}：${statMessage}`);
      }
    }
    for (const row of rows) {
      const record = parseDailyRow(row, symbol.trim());
      if (record) {
        if (record.timestamp < start || record.timestamp > end) {
          continue;
        }
        collected.push(record);
      }
    }
  }

  collected.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const deduped = collected.filter((record, index, array) => {
    if (index === 0) {
      return true;
    }
    return record.timestamp.getTime() !== array[index - 1].timestamp.getTime();
  });

  if (deduped.length === 0) {
    throw new Error(`無法取得 ${symbol} 在所選區間的交易資料`);
  }

  return deduped;
}

export async function buildTwseSeries(
  symbol: string,
  start: Date,
  end: Date,
  sourceName?: string
): Promise<ParsedPriceSeries> {
  const records = await fetchTwseDailySeries(symbol, start, end);
  return {
    symbol,
    records,
    frequency: 'daily',
    sourceName: sourceName || `TWSE-${symbol}`,
    start: records[0].timestamp,
    end: records[records.length - 1].timestamp
  } satisfies ParsedPriceSeries;
}
