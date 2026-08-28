import type { ReactNode } from 'react';

export default function AlertRow({ tone = 'warning', children }: { tone?: 'warning' | 'critical'; children: ReactNode }) {
  return <div className={`alert-row ${tone === 'critical' ? 'alert-row-critical' : ''}`} role="alert">{children}</div>;
}
