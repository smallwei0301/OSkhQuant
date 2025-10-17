const COMPANY_ENDPOINT = 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L';
const FUNCTION_USER_AGENT = 'Lazybacktest-Netlify/1.0';

const BASE_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=3600'
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

function pickValue(row, keys) {
  for (const key of keys) {
    if (typeof row[key] === 'string' && row[key].trim()) {
      return row[key].trim();
    }
  }
  return '';
}

function mapCompany(raw) {
  const code = pickValue(raw, ['\u516c\u53f8\u4ee3\u865f', 'Code', '\u8b49\u5238\u4ee3\u865f', 'StockNo', 'stock_code']);
  const name = pickValue(raw, ['\u516c\u53f8\u7c21\u7a31', '\u516c\u53f8\u540d\u7a31', 'Name', '\u516c\u53f8\u5168\u540d']);
  if (!code || !name) {
    return null;
  }

  return {
    code,
    name,
    fullName: pickValue(raw, ['\u516c\u53f8\u540d\u7a31', '\u516c\u5168\u540d', 'FullName']) || undefined,
    industry: pickValue(raw, ['\u7522\u696d\u5225', 'Industry', '\u7522\u696d\u5206\u985e']) || undefined,
    listingDate: pickValue(raw, ['\u4e0a\u5e02\u65e5\u671f', 'ListingDate']) || undefined,
    cfiCode: pickValue(raw, ['CFICode', '\u570b\u969b\u8b49\u5238\u8fa8\u8b58\u865f']) || undefined
  };
}

exports.handler = async () => {
  try {
    const response = await fetch(COMPANY_ENDPOINT, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'User-Agent': FUNCTION_USER_AGENT,
        Referer: 'https://openapi.twse.com.tw/',
        Origin: 'https://openapi.twse.com.tw'
      }
    });

    const rawText = stripBom(await response.text());

    if (!response.ok) {
      const debugId = `twse-companies-${Date.now()}`;
      console.error('TWSE company response not ok', debugId, response.status, rawText);
      return {
        statusCode: response.status,
        headers: BASE_HEADERS,
        body: JSON.stringify({
          error: `台灣證交所公司名錄服務暫時無法使用，請稍後再試（錯誤代碼：${debugId}）`
        })
      };
    }

    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch (error) {
      payload = null;
    }

    let dataset;
    if (Array.isArray(payload)) {
      dataset = payload;
    } else if (payload && Array.isArray(payload.data)) {
      dataset = payload.data;
    } else {
      const csvRows = parseCsvPayload(rawText);
      if (csvRows) {
        console.warn('TWSE company fallback to CSV payload');
        dataset = csvRows;
      } else {
        const debugId = `twse-companies-${Date.now()}`;
        console.error('TWSE company payload parse failed', debugId, rawText.slice(0, 200));
        return {
          statusCode: 502,
          headers: BASE_HEADERS,
          body: JSON.stringify({
            error: `台灣證交所回傳格式異常，請稍後重試（錯誤代碼：${debugId}）`
          })
        };
      }
    }

    const companies = dataset
      .map(mapCompany)
      .filter((item) => Boolean(item))
      .sort((a, b) => a.code.localeCompare(b.code));

    return {
      statusCode: 200,
      headers: BASE_HEADERS,
      body: JSON.stringify({
        companies,
        updatedAt: new Date().toISOString()
      })
    };
  } catch (error) {
    const debugId = `twse-companies-${Date.now()}`;
    console.error('TWSE company list fetch failed', debugId, error);
    return {
      statusCode: 502,
      headers: BASE_HEADERS,
      body: JSON.stringify({
        error: `台灣證交所公司名錄連線失敗，請稍後再試（錯誤代碼：${debugId}）`
      })
    };
  }
};
