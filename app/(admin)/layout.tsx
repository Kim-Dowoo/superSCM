import type { ReactNode } from 'react';
import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';

export default function AdminLayout({ children }: { children: ReactNode }) { return <div className="app-shell"><Sidebar scope="ADMIN" /><main className="main"><Topbar scope="ADMIN" />{children}</main></div>; }
