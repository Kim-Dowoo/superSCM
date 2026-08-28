import LogoutButton from '@/components/auth/logout-button';

export default function Topbar({ scope }: { scope: 'USER' | 'ADMIN' }) {
  return <header className="topbar"><h1 className="topbar-title">{scope === 'ADMIN' ? '시스템 관리' : 'SCM Intelligence'}</h1><div className="topbar-meta"><span>2026.09</span><span>로컬 프로토타입</span><LogoutButton /></div></header>;
}
