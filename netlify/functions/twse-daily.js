const DAILY_ENDPOINT = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY';
const FUNCTION_USER_AGENT = 'Lazybacktest-Netlify/1.0';

const BASE_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=900'
};

function stripBom(value) {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(/^\uFEFF/, '');
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCsvPayload(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  const trimmed = stripBom(rawText).trim();
  if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return null;
  }

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1 || !lines[0].includes(',')) {
    return null;
  }

  const header = parseCsvLine(lines[0]);
  if (header.length === 0) {
    return null;
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length === 0) {
      continue;
    }

    const record = {};
    header.forEach((field, index) => {
      if (field && cells[index] !== undefined) {
        record[field] = cells[index];
      }
    });
    if (Object.keys(record).length > 0) {
      rows.push(record);
    }
  }

  return rows.length > 0 ? rows : null;
}

const TW_TZ_OFFSET = '+08:00';

function normalizeSeparator(value) {
  return value.replace(/[.]/g, '/').replace(/-/g, '/');
}

function toGregorianYear(year) {
  if (!Number.isFinite(year)) {
    return Number.NaN;
  }
  return year < 1911 ? year + 1911 : year;
}

function parseTwseDateToIso(value) {
  if (!value) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  const separated = normalizeSeparator(trimmed);
  const parts = separated
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean);
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
        return `${year}-${String(parsedMonth).padStart(2, '0')}-${String(parsedDay).padStart(2, '0')}`;
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
      return `${rawYear}-${String(rawMonth).padStart(2, '0')}-${String(rawDay).padStart(2, '0')}`;
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
      return `${gregorianYear}-${String(rawMonth).padStart(2, '0')}-${String(rawDay).padStart(2, '0')}`;
    }
  }

  return null;
}

function sanitizeNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === '--') {
    return null;
  }
  const normalized = trimmed.replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return undefined;
}

function parseDailyRow(row, symbol) {
  const dateValue = pickValue(row, ['Date', '\u65e5\u671f', '\u5e74\u6708\u65e5']);
  const date = parseTwseDateToIso(dateValue);
  if (!date) {
    return null;
  }

  const open = sanitizeNumber(pickValue(row, ['Open', '\u958b\u76e4\u50f9', '\u958b\u76e4']));
  const high = sanitizeNumber(pickValue(row, ['High', '\u6700\u9ad8\u50f9', '\u6700\u9ad8']));
  const low = sanitizeNumber(pickValue(row, ['Low', '\u6700\u4f4e\u50f9', '\u6700\u4f4e']));
  const close = sanitizeNumber(pickValue(row, ['Close', '\u6536\u76e4\u50f9', '\u6536\u76e4']));
  const volume = sanitizeNumber(pickValue(row, ['TradeVolume', '\u6210\u4ea4\u80a1\u6578', '\u6210\u4ea4\u91cf'])) ?? 0;

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
    date,
    open,
    high,
    low,
    close,
    volume
  };
}

function parseDateInput(value) {
  if (!value) {
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }
  const date = new Date(`${normalized}T00:00:00${TW_TZ_OFFSET}`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatDateKey(date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 10);
}

function uniqueByDate(records) {
  const map = new Map();
  for (const record of records) {
    if (!map.has(record.date)) {
      map.set(record.date, record);
    }
  }
  return Array.from(map.values());
}

function mapRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    if (Array.isArray(payload.fields)) {
      return payload.data.map((row) => {
        const record = {};
        payload.fields.forEach((field, index) => {
          if (row[index] !== undefined) {
            record[field] = row[index];
          }
        });
        return record;
      });
    }
    return payload.data;
  }
  return [];
}

function buildMonthlyLabel(symbol, year, month) {
  return `${symbol} ${year}-${String(month + 1).padStart(2, '0')}`;
}

function parseJsonPayload(rawText) {
  if (!rawText) {
    return null;
  }
  try {
    return JSON.parse(rawText);
  } catch (error) {
    return null;
  }
}

exports.handler = async (event) => {
  const context = {
    symbol: '',
    start: '',
    end: ''
  };

  try {
    const params = event.queryStringParameters || {};
    context.symbol = (params.symbol || '').trim();
    context.start = params.start || '';
    context.end = params.end || '';

    const { symbol } = context;
    const startRaw = context.start;
    const endRaw = context.end;

    if (!symbol) {
      return {
        statusCode: 400,
        headers: BASE_HEADERS,
        body: JSON.stringify({ error: '請提供 symbol 參數' })
      };
    }

    const startDate = parseDateInput(startRaw);
    const endDate = parseDateInput(endRaw);
    if (!startDate || !endDate) {
      return {
        statusCode: 400,
        headers: BASE_HEADERS,
        body: JSON.stringify({ error: '請提供合法的 start 與 end 日期（YYYY-MM-DD）' })
      };
    }
    if (startDate > endDate) {
      return {
        statusCode: 400,
        headers: BASE_HEADERS,
        body: JSON.stringify({ error: 'start 必須早於 end' })
      };
    }

    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    const monthSlots = [];
    for (let year = startYear; year <= endYear; year += 1) {
      const monthFrom = year === startYear ? startMonth : 0;
      const monthTo = year === endYear ? endMonth : 11;
      for (let month = monthFrom; month <= monthTo; month += 1) {
        monthSlots.push({ year, month });
      }
    }

    const collected = [];
    const warnings = [];

    for (const slot of monthSlots) {
      const dateParam = `${slot.year}${String(slot.month + 1).padStart(2, '0')}01`;
      const url = `${DAILY_ENDPOINT}?response=json&date=${dateParam}&stockNo=${encodeURIComponent(symbol)}`;
      let response;
      try {
        response = await fetch(url, {
          headers: {
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
            'User-Agent': FUNCTION_USER_AGENT,
            Referer: 'https://openapi.twse.com.tw/',
            Origin: 'https://openapi.twse.com.tw'
          }
        });
      } catch (error) {
        console.error('TWSE daily fetch failed', symbol, dateParam, error);
        warnings.push(`${buildMonthlyLabel(symbol, slot.year, slot.month)}：連線失敗`);
        continue;
      }

      let rawText;
      try {
        rawText = stripBom(await response.text());
      } catch (error) {
        console.error('TWSE daily read failed', symbol, dateParam, error);
        warnings.push(`${buildMonthlyLabel(symbol, slot.year, slot.month)}：資料讀取失敗`);
        continue;
      }

      if (!response.ok) {
        console.error('TWSE daily response not ok', symbol, dateParam, response.status, rawText);
        warnings.push(
          `${buildMonthlyLabel(symbol, slot.year, slot.month)}：HTTP ${response.status} ${response.statusText || ''}`.trim()
        );
        continue;
      }

      const payload = parseJsonPayload(rawText);
      let rows = [];
      let statMessage;

      if (payload) {
        rows = mapRows(payload);
        statMessage = typeof payload.stat === 'string' ? payload.stat : undefined;
      } else {
        const csvRows = parseCsvPayload(rawText);
        if (csvRows) {
          console.warn('TWSE daily fallback to CSV payload', symbol, dateParam);
          rows = csvRows;
        } else {
          console.error('TWSE daily payload parse failed', symbol, dateParam, rawText.slice(0, 200));
          warnings.push(`${buildMonthlyLabel(symbol, slot.year, slot.month)}：台灣證交所回傳格式異常`);
          continue;
        }
      }

      if (rows.length === 0) {
        if (statMessage && statMessage !== 'OK') {
          warnings.push(`${symbol}：${statMessage}（${slot.year}-${String(slot.month + 1).padStart(2, '0')}）`);
        } else {
          const fallbackMessage = rawText.includes('查無資料')
            ? '查無資料'
            : '未提供有效資料';
          warnings.push(`${buildMonthlyLabel(symbol, slot.year, slot.month)}：${fallbackMessage}`);
        }
        continue;
      }

      for (const row of rows) {
        const record = parseDailyRow(row, symbol);
        if (!record) {
          continue;
        }
        if (record.date < formatDateKey(startDate) || record.date > formatDateKey(endDate)) {
          continue;
        }
        collected.push(record);
      }
    }

    const deduped = uniqueByDate(
      collected.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    );

    if (deduped.length === 0) {
      return {
        statusCode: 404,
        headers: BASE_HEADERS,
        body: JSON.stringify({
          error: `無法取得 ${symbol} 在所選區間的交易資料`,
          warnings
        })
      };
    }

    return {
      statusCode: 200,
      headers: BASE_HEADERS,
      body: JSON.stringify({
        symbol,
        start: formatDateKey(startDate),
        end: formatDateKey(endDate),
        records: deduped,
        warnings
      })
    };
  } catch (error) {
    const debugId = `twse-daily-${Date.now()}`;
    console.error('TWSE daily unexpected error', debugId, context, error);
    return {
      statusCode: 502,
      headers: BASE_HEADERS,
      body: JSON.stringify({
        error: '台灣證交所資料解析流程發生非預期錯誤，請稍後再試',
        warnings: [`函式錯誤代碼：${debugId}`]
      })
    };
  }
};
