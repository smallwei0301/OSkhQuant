import tradeSchemas from '../../../models/schemas/trade.json';
import type { TradeCostRequest } from '@/lib/types';

const tradeCostRequestSchema = tradeSchemas.definitions.TradeCostRequest;

export default function ServicesPage() {
  const sample = tradeCostRequestSchema.example as TradeCostRequest | undefined;

  return (
    <section id="trade-cost" className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-3xl font-semibold text-brand-800">交易成本試算 API</h2>
        <p className="text-brand-600">
          藉由 FastAPI 將 khTrade.py 的成本試算模組無狀態化，並部署於 Netlify Functions。
        </p>
      </header>
      <article className="card space-y-4">
        <h3 className="text-xl font-semibold text-brand-800">請求格式</h3>
        <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-slate-50">
          <code>{JSON.stringify(sample, null, 2)}</code>
        </pre>
        <p className="text-sm text-brand-500">
          透過共享 JSON Schema，前端與後端可套用相同驗證規則。
        </p>
      </article>
    </section>
  );
}
