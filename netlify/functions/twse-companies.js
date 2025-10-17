const COMPANY_ENDPOINT = 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L';
const FUNCTION_USER_AGENT = 'Lazybacktest-Netlify/1.0';

const BASE_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=3600'
};

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
        'User-Agent': FUNCTION_USER_AGENT
      }
    });

    const rawText = await response.text();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: BASE_HEADERS,
        body: JSON.stringify({
          error: '台灣證交所公司名錄服務暫時無法使用，請稍後再試'
        })
      };
    }

    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch (error) {
      console.error('TWSE company payload parse failed', rawText.slice(0, 200));
      return {
        statusCode: 502,
        headers: BASE_HEADERS,
        body: JSON.stringify({
          error: '台灣證交所回傳格式異常，請稍後重試'
        })
      };
    }

    if (!Array.isArray(payload)) {
      return {
        statusCode: 502,
        headers: BASE_HEADERS,
        body: JSON.stringify({
          error: '台灣證交所回傳格式異常，請稍後重試'
        })
      };
    }

    const companies = payload
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
    console.error('TWSE company list fetch failed', error);
    return {
      statusCode: 502,
      headers: BASE_HEADERS,
      body: JSON.stringify({
        error: '台灣證交所公司名錄連線失敗，請稍後再試'
      })
    };
  }
};
