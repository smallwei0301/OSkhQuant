const REQUIRED_COLUMNS = ['time', 'open', 'high', 'low', 'close', 'volume'];

function inferFrequency(rows) {
  if (rows.length < 2) return '1d';
  const diff = rows[1].time.getTime() - rows[0].time.getTime();
  const minute = 60 * 1000;
  if (diff <= minute) return '1m';
  if (diff <= 5 * minute) return '5m';
  if (diff <= 15 * minute) return '15m';
  if (diff <= 30 * minute) return '30m';
  if (diff <= 60 * minute) return '60m';
  return '1d';
}

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    if (!window.Papa) {
      reject(new Error('找不到 PapaParse 解析器，請確認網路連線。'));
      return;
    }
    window.Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, errors, meta } = results;
        if (errors.length) {
          reject(new Error(errors.map((err) => err.message).join('\n')));
          return;
        }
        const headers = meta.fields || [];
        const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
        if (missing.length) {
          reject(new Error(`CSV 檔缺少欄位：${missing.join(', ')}`));
          return;
        }
        const rows = data.map((row) => ({
          time: new Date(row.time),
          open: Number(row.open),
          high: Number(row.high),
          low: Number(row.low),
          close: Number(row.close),
          volume: Number(row.volume || 0),
          amount: row.amount ? Number(row.amount) : undefined
        })).filter((row) => !Number.isNaN(row.close));
        resolve({
          symbol: file.name.replace(/\.csv$/i, '').toUpperCase(),
          frequency: inferFrequency(rows),
          rows
        });
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}
