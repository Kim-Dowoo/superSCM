import type { StockoutReason } from '../../lib/scm-model';

const labels: Record<Exclude<StockoutReason, null>, string> = {
  NO_USAGE: '사용 이력 없음',
  NO_LEADTIME: '리드타임 없음',
};

export default function ReasonBadge({ reason }: { reason: StockoutReason }) {
  return reason ? <span className="tag gray">{labels[reason]}</span> : <span className="muted">—</span>;
}
