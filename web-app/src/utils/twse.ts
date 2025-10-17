import type { ParsedPriceSeries, PriceRecord, TwseCompany } from '../types';

const TW_TZ_OFFSET = '+08:00';

function stripBom(value: string): string {
  return value.replace(/^\uFEFF/, '');
}

function normalizeSeparator(value: string): string {
  return value.replace(/[.]/g, '/').replace(/-/g, '/');
}

function toGregorianYear(year: number): number {
  if (!Number.isFinite(year)) {
    return Number.NaN;
  }
  return year < 1911 ? year + 1911 : year;
}

function normalizeFunctionBase(input: string): string {
  const trimmed = input.replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (typeof window !== 'undefined') {
    if (trimmed.startsWith('/')) {
      return `${window.location.origin}${trimmed}`;
    }
    return `${window.location.origin}/${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return `http://localhost:8888${trimmed}`;
  }
  return `http://localhost:8888/${trimmed}`;
}

interface FunctionErrorPayload {
  error?: string;
  warnings?: string[];
}

interface CompaniesResponse {
  companies: TwseCompany[];
  updatedAt: string;
}

interface DailyRecordPayload {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DailyResponse extends FunctionErrorPayload {
  symbol: string;
  start: string;
  end: string;
  records: DailyRecordPayload[];
}

interface DailySeriesResult {
  records: PriceRecord[];
  warnings: string[];
}

function resolveFunctionBase(): string {
  const override = import.meta.env?.VITE_NETLIFY_FUNCTION_BASE;
  if (override) {
    return normalizeFunctionBase(override);
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' && window.location.port === '5173') {
      return 'http://localhost:8888/.netlify/functions';
    }
    return `${window.location.origin}/.netlify/functions`;
  }
  return 'http://localhost:8888/.netlify/functions';
}

async function invokeNetlifyFunction<T>(name: string, params?: Record<string, string>): Promise<T> {
  const base = resolveFunctionBase();
  const url = new URL(`${base}/${name}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json'
      }
    });
  } catch (error) {
    throw new Error('台灣證交所服務連線失敗，請確認網路環境後再試');
  }

  let rawText: string;
  try {
    rawText = await response.text();
  } catch (error) {
    throw new Error('台灣證交所服務回傳格式異常，請稍後再試');
  }

  const sanitized = stripBom(rawText);
  const trimmed = sanitized.trim();

  if (!trimmed) {
    if (!response.ok) {
      throw new Error(`台灣證交所服務暫時無法使用（HTTP ${response.status}）`);
    }
    throw new Error('台灣證交所服務未回傳有效內容，請稍後再試');
  }

  let payload: T | (FunctionErrorPayload & Record<string, unknown>) | null = null;
  try {
    payload = JSON.parse(trimmed) as T | (FunctionErrorPayload & Record<string, unknown>);
  } catch (error) {
    console.error(`Failed to parse Netlify function payload for ${name}`, trimmed.slice(0, 200));
  }

  if (!payload) {
    const fallbackMessage = response.ok
      ? '台灣證交所服務回傳格式異常，請稍後再試（函式回應非 JSON）'
      : `台灣證交所服務暫時無法使用（HTTP ${response.status}）`;
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `台灣證交所服務暫時無法使用（HTTP ${response.status}）`;
    throw new Error(message);
  }

  return payload as T;
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
  const payload = await invokeNetlifyFunction<CompaniesResponse>('twse-companies');
  if (!Array.isArray(payload.companies) || payload.companies.length === 0) {
    throw new Error('台灣證交所目前未提供上市公司名錄，請稍後再試');
  }
  return payload.companies;
}

export async function fetchTwseDailySeries(
  symbol: string,
  start: Date,
  end: Date
): Promise<DailySeriesResult> {
  if (!symbol) {
    throw new Error('請輸入股票代碼');
  }
  if (start > end) {
    throw new Error('開始日期需早於結束日期');
  }

  const payload = await invokeNetlifyFunction<DailyResponse>('twse-daily', {
    symbol: symbol.trim(),
    start: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    end: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
  });

  if (!Array.isArray(payload.records) || payload.records.length === 0) {
    throw new Error(`無法取得 ${symbol} 在所選區間的交易資料`);
  }

  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  const records = payload.records.map((record) => ({
    symbol: record.symbol,
    timestamp: new Date(`${record.date}T00:00:00${TW_TZ_OFFSET}`),
    open: record.open,
    high: record.high,
    low: record.low,
    close: record.close,
    volume: record.volume
  } satisfies PriceRecord));

  if (warnings.length > 0) {
    console.warn('TWSE daily warnings:', warnings);
  }

  return { records, warnings };
}

export async function buildTwseSeries(
  symbol: string,
  start: Date,
  end: Date,
  sourceName?: string
): Promise<ParsedPriceSeries> {
  const { records, warnings } = await fetchTwseDailySeries(symbol, start, end);
  const series: ParsedPriceSeries = {
    symbol,
    records,
    frequency: 'daily',
    sourceName: sourceName || `TWSE-${symbol}`,
    start: records[0].timestamp,
    end: records[records.length - 1].timestamp
  } satisfies ParsedPriceSeries;

  if (warnings.length > 0) {
    series.warnings = warnings;
  }

  return series;
}
