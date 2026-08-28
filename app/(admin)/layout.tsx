import type { ReactNode } from 'react';
import LogoutButton from '@/components/auth/logout-button';
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
        <div className="page-content"><LogoutButton /></div>
        {children}
      </main>
    </div>
  );
}
