'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getMenuItems, type MenuScope } from '@/lib/menu';

export default function Sidebar({ scope }: { scope: MenuScope }) {
  const pathname = usePathname();
  const items = getMenuItems(scope);

  return <aside className="sidebar">
    <div className="sidebar-brand"><div className="sidebar-mark">SC</div><div><strong>superSCM</strong><span>Procurement Intelligence</span></div></div>
    <div className="sidebar-group">{scope === 'ADMIN' ? '관리' : '분석'}</div>
    <nav className="sidebar-nav" aria-label={`${scope === 'ADMIN' ? '관리자' : '사용자'} 메뉴`}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return <Link key={item.href} className="sidebar-link" href={item.href} aria-current={active ? 'page' : undefined}><Icon size={16} /><span>{item.label}</span></Link>;
      })}
    </nav>
    <div className="sidebar-footer">한국후지필름BI<br />월간 발주계획 시스템</div>
  </aside>;
}
