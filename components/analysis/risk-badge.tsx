import type { StockoutRiskStatus } from '../../lib/scm-model';

const labels: Record<StockoutRiskStatus, string> = {
  SAFE: '안전',
  CRITICAL: '소진 임박',
  UNKNOWN: '판단 불가',
};

export default function RiskBadge({ status }: { status: StockoutRiskStatus }) {
  const tone = status === 'SAFE' ? 'green' : status === 'CRITICAL' ? 'red' : 'gray';
  return <span className={`tag ${tone}`}>{labels[status]}</span>;
}
