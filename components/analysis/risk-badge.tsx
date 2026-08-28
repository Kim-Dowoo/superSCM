import type { StockoutRiskStatus } from '../../lib/scm-model';

const labels: Record<StockoutRiskStatus, string> = {
  SAFE: '안전',
  CRITICAL: '소진 임박',
  WARNING: '주의',
  CALCULATION_UNAVAILABLE: '계산 불가',
  UNKNOWN: '판단 불가',
};

export default function RiskBadge({ status }: { status: StockoutRiskStatus }) {
  const tone = status === 'SAFE' ? 'green' : status === 'CRITICAL' ? 'red' : status === 'WARNING' ? 'amber' : 'gray';
  return <span className={`tag ${tone}`}>{labels[status]}</span>;
}
