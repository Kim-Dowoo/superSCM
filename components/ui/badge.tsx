export type StatusTone = 'SAFE' | 'WARNING' | 'CRITICAL' | 'CALCULATION_UNAVAILABLE';

const labels: Record<StatusTone, string> = { SAFE: '안전', WARNING: '주의', CRITICAL: '위험', CALCULATION_UNAVAILABLE: '계산 불가' };

export default function Badge({ status, label }: { status: StatusTone; label?: string }) {
  return <span className={`badge badge-${status.toLowerCase().replaceAll('_', '-')}`}>{label ?? labels[status]}</span>;
}
