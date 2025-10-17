import '@/app/globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = {
  title: 'Lazybacktest 控制台',
  description: 'Lazybacktest 面向台灣用戶的量化策略體驗平台。'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
