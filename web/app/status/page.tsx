export default function StatusPage() {
  const checks = [
    { name: 'FastAPI 交易服務', status: '待串接', detail: '尚未配置 API 網域' },
    { name: 'Netlify Functions', status: '已準備', detail: '已完成環境初始化' },
    { name: '資料庫連線', status: '待設定', detail: '需配置雲端資料庫憑證' }
  ];

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-3xl font-semibold text-brand-800">系統狀態</h2>
        <p className="text-brand-600">
          以可觀測性為核心，追蹤 Lazybacktest 在 Netlify 上的部署健康度。
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {checks.map((check) => (
          <article key={check.name} className="card space-y-2">
            <h3 className="text-lg font-semibold text-brand-800">{check.name}</h3>
            <p className="text-sm font-medium text-brand-600">狀態：{check.status}</p>
            <p className="text-sm text-brand-500">{check.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
