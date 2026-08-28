import type { ReactNode } from 'react';
import Panel from './panel';

export default function KpiCard({ label, value, foot }: { label: string; value: ReactNode; foot: ReactNode }) {
  return <Panel><div className="kpi-card"><p className="kpi-label">{label}</p><div className="kpi-value">{value}</div><p className="kpi-foot">{foot}</p></div></Panel>;
}
