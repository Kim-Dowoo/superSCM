import type { ReactNode } from 'react';
import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';

export default function AnalysisLayout({ children }: { children: ReactNode }) {
  return <div className="app-shell"><Sidebar scope="USER" /><main className="main"><Topbar scope="USER" />{children}</main></div>;
}
