'use client';

import Link from 'next/link';
import { PropsWithChildren, useMemo } from 'react';

const navigation = [
  { name: '儀表板', href: '/' },
  { name: '策略服務', href: '/services' },
  { name: '系統狀態', href: '/status' }
];

export function AppShell({ children }: PropsWithChildren) {
  const appEnv = useMemo(
    () => process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
    []
  );

  return (
    <div className="main-container space-y-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-brand-500">Lazybacktest</p>
          <h1 className="text-4xl font-bold gradient-text">量化後台總覽</h1>
          <p className="mt-2 text-sm text-brand-700/80">
            每日 1 萬次瀏覽、6 千名活躍交易者的共享回測平台。
          </p>
        </div>
        <div className="card flex flex-col gap-2 text-sm text-brand-700">
          <span className="font-semibold">環境狀態</span>
          <span>
            App Env：
            <strong className="ml-1 font-semibold text-brand-600">{appEnv}</strong>
          </span>
          <span>
            API Base：
            <strong className="ml-1 font-semibold text-brand-600">
              {process.env.NEXT_PUBLIC_API_BASE_URL ?? '未設定'}
            </strong>
          </span>
        </div>
      </header>
      <nav className="flex flex-wrap gap-3">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="rounded-full border border-brand-200 px-4 py-2 text-sm text-brand-700 transition hover:border-brand-400 hover:text-brand-900"
          >
            {item.name}
          </Link>
        ))}
      </nav>
      <main className="space-y-8">{children}</main>
      <footer className="border-t border-brand-100 pt-6 text-sm text-brand-500">
        Lazybacktest © {new Date().getFullYear()} · 提供穩定回測與交易體驗
      </footer>
    </div>
  );
}
