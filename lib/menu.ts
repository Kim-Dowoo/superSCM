import { BarChart3, Gauge, Settings, UsersRound } from 'lucide-react';
import type { ComponentType } from 'react';

export type MenuScope = 'USER' | 'ADMIN';
export type MenuItem = { href: string; label: string; icon: ComponentType<{ size?: number }>; scope: MenuScope };

export const menuItems: MenuItem[] = [
  { href: '/', label: '대시보드', icon: Gauge, scope: 'USER' },
  { href: '/analysis/leadtime', label: '리드타임 격차', icon: BarChart3, scope: 'USER' },
  { href: '/analysis/stockout', label: '재고 소진 위험', icon: BarChart3, scope: 'USER' },
  { href: '/analysis/inventory-projection', label: 'Inventory Projection', icon: BarChart3, scope: 'USER' },
  { href: '/analysis/demand-profile', label: 'SKU 수요 프로파일', icon: BarChart3, scope: 'USER' },
  { href: '/analysis/model-comparison', label: '모델 비교', icon: BarChart3, scope: 'USER' },
  { href: '/admin', label: '관리 설정', icon: Settings, scope: 'ADMIN' },
  { href: '/admin/users', label: '사용자 관리', icon: UsersRound, scope: 'ADMIN' },
  { href: '/admin/forecast-settings', label: 'Forecast 설정', icon: Settings, scope: 'ADMIN' },
  { href: '/admin/data-management', label: '데이터 관리', icon: Settings, scope: 'ADMIN' },
  { href: '/admin/forecast-models', label: 'Forecast 모델', icon: Settings, scope: 'ADMIN' },
  { href: '/admin/forecast-runs', label: 'Forecast 실행 이력', icon: Settings, scope: 'ADMIN' },
  { href: '/admin/scm-policies/leadtime', label: 'Lead Time 정책', icon: Settings, scope: 'ADMIN' },
];

export function getMenuItems(scope: MenuScope) { return menuItems.filter((item) => item.scope === scope); }
