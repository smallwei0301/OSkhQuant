import type { StockListItem, TwseListedCompanyRaw } from '../types';

const TWSE_LISTED_ENDPOINT = 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L';

const sanitizeString = (value?: string): string => (typeof value === 'string' ? value.trim() : '');

const normalizeDate = (value?: string): string | undefined => {
  const raw = sanitizeString(value);
  if (!raw) {
    return undefined;
  }
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  const normalized = raw.replace(/[./]/g, '-');
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return raw;
};

const resolveUpdatedAt = (records: TwseListedCompanyRaw[]): string | undefined => {
  const fields: (keyof TwseListedCompanyRaw)[] = ['更新日期', '資料日期', '出表日期'];
  for (const field of fields) {
    for (const entry of records) {
      const candidate = normalizeDate(entry[field]);
      if (candidate) {
        return candidate;
      }
    }
  }
  return undefined;
};

interface FetchTwseResult {
  companies: StockListItem[];
  updatedAt?: string;
}

export async function fetchTwseListedCompanies(signal?: AbortSignal): Promise<FetchTwseResult> {
  const response = await fetch(TWSE_LISTED_ENDPOINT, {
    method: 'GET',
    signal,
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`臺灣證券交易所 OpenAPI 回應狀態 ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error('OpenAPI 回傳格式異常，預期為陣列');
  }

  const records = payload as TwseListedCompanyRaw[];

  const companies: StockListItem[] = records
    .map((entry) => {
      const code = sanitizeString(entry.公司代號);
      const name = sanitizeString(entry.公司簡稱 || entry.公司名稱);
      if (!code || !name) {
        return null;
      }
      const industry = sanitizeString(entry.產業別);
      const isin = sanitizeString(entry.統一編號 || entry.營利事業統一編號);
      return {
        code,
        name,
        exchange: 'TWSE',
        industry: industry || undefined,
        listingDate: normalizeDate(entry.上市日),
        isin: isin || undefined
      } satisfies StockListItem;
    })
    .filter((item): item is StockListItem => item !== null)
    .sort((a, b) => a.code.localeCompare(b.code, 'zh-Hant'));

  return {
    companies,
    updatedAt: resolveUpdatedAt(records)
  };
}
