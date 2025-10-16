import type { StockListItem } from '../types';

interface TwseRawListing {
  [key: string]: string | null | undefined;
}

const API_ENDPOINT = 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L';

const normalizeListingDate = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.replace(/民國/g, '').replace(/\s+/g, '').trim();
  if (!trimmed) {
    return undefined;
  }
  const sanitized = trimmed.replace(/[.]/g, '/').replace(/-/g, '/');
  if (/^\d{7,8}$/.test(sanitized)) {
    const year = Number(sanitized.slice(0, sanitized.length - 4));
    const month = Number(sanitized.slice(-4, -2));
    const day = Number(sanitized.slice(-2));
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      const normalizedYear = year < 1911 ? year + 1911 : year;
      return `${normalizedYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
        .toString()
        .padStart(2, '0')}`;
    }
  }
  const parts = sanitized.split('/');
  if (parts.length === 3) {
    const yearRaw = parts[0];
    const monthRaw = parts[1];
    const dayRaw = parts[2];
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      const normalizedYear = year < 1911 ? year + 1911 : year;
      return `${normalizedYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
        .toString()
        .padStart(2, '0')}`;
    }
  }
  return undefined;
};

const safeTrim = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export interface TwseListingResult {
  items: StockListItem[];
  fetchedAt: string;
  source: string;
}

export async function fetchTwseListings(options: { signal?: AbortSignal } = {}): Promise<TwseListingResult> {
  const { signal } = options;
  const response = await fetch(API_ENDPOINT, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    signal
  });

  if (!response.ok) {
    throw new Error(`台灣證交所 OpenAPI 讀取失敗（HTTP ${response.status}）`);
  }

  const rawData = (await response.json()) as TwseRawListing[];

  const unique = new Map<string, StockListItem>();
  for (const row of rawData) {
    const code = safeTrim((row['公司代號'] as string) ?? (row['證券代號'] as string));
    const name = safeTrim((row['公司名稱'] as string) ?? (row['證券名稱'] as string));
    if (!code || !name) {
      continue;
    }

    const exchange = safeTrim((row['市場別'] as string) ?? (row['上市別'] as string)) ?? 'TWSE';
    const industry = safeTrim((row['產業別'] as string) ?? (row['產業分類'] as string));
    const listingDate = normalizeListingDate((row['上市日期'] as string) ?? (row['上市日'] as string));
    const isin = safeTrim((row['國際證券辨識號碼(ISIN)'] as string) ?? (row['ISIN'] as string));
    const status = safeTrim((row['備註'] as string) ?? (row['註記'] as string));

    unique.set(code, {
      code,
      name,
      exchange,
      industry,
      listingDate,
      isin,
      status
    });
  }

  const items = Array.from(unique.values()).sort((a, b) => a.code.localeCompare(b.code));
  const headerTimestamp = response.headers.get('last-modified');
  let fetchedAt = new Date().toISOString();
  if (headerTimestamp) {
    const parsed = new Date(headerTimestamp);
    if (!Number.isNaN(parsed.getTime())) {
      fetchedAt = parsed.toISOString();
    }
  }

  return {
    items,
    fetchedAt,
    source: API_ENDPOINT
  };
}
