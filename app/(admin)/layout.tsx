import type { ReactNode } from 'react';
import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="app-shell">
      <Sidebar scope="ADMIN" />
      <main className="main">
        <Topbar scope="ADMIN" />
        {children}
      </main>
    </div>
  );
}
