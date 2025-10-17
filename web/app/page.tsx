import Link from 'next/link';
import type { TradeSummary } from '@/lib/types';
import { getServiceCatalog } from '@/lib/service-catalog';

async function loadDemoSummary(): Promise<TradeSummary> {
  return {
    strategyId: 'demo-strategy',
    timestamp: new Date().toISOString(),
    trades: 0,
    realizedPnl: 0,
    unrealizedPnl: 0,
    warnings: ['尚未連接 FastAPI 服務']
  };
}

export default async function HomePage() {
  const summary = await loadDemoSummary();
  const services = getServiceCatalog();

  return (
    <section className="space-y-6">
      <div className="card space-y-4">
        <h2 className="text-2xl font-semibold text-brand-800">交易摘要</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-brand-500">策略 ID</dt>
            <dd className="text-lg font-medium text-brand-800">{summary.strategyId}</dd>
          </div>
          <div>
            <dt className="text-sm text-brand-500">最近更新</dt>
            <dd className="text-lg font-medium text-brand-800">
              {new Date(summary.timestamp).toLocaleString('zh-TW')}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-brand-500">已成交筆數</dt>
            <dd className="text-lg font-medium text-brand-800">{summary.trades}</dd>
          </div>
          <div>
            <dt className="text-sm text-brand-500">實現 / 未實現損益</dt>
            <dd className="text-lg font-medium text-brand-800">
              {summary.realizedPnl} / {summary.unrealizedPnl}
            </dd>
          </div>
        </dl>
        {summary.warnings.length > 0 && (
          <ul className="list-inside list-disc text-sm text-orange-600">
            {summary.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-brand-800">服務模組</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <article key={service.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-brand-800">
                    {service.title}
                  </h3>
                  <p className="mt-1 text-sm text-brand-600">{service.description}</p>
                </div>
                <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {service.category}
                </span>
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm text-brand-600">
                {service.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
              <Link
                className="inline-flex items-center text-sm font-semibold text-brand-600 hover:text-brand-800"
                href={service.href}
              >
                瞭解更多 →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
