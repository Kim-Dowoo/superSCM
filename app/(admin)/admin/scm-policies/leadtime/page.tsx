import AlertRow from '@/components/ui/alert-row';
import EmptyValue from '@/components/ui/empty-value';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import Badge from '@/components/ui/badge';
import { requireAdmin } from '@/lib/auth';
import { getLeadtimePolicies } from '@/lib/scm';
import { updateLeadtime } from './actions';

export const dynamic = 'force-dynamic';

export default async function LeadtimePolicyPage() {
  await requireAdmin();
  const { rows, error } = await getLeadtimePolicies();
  return <div className="page-content"><PageHeader title="Lead Time 정책" description="관리자 확정값을 우선하고, 미확정 공급처는 실적 P80을 적용합니다." />
    {error ? <AlertRow tone="critical">조회에 실패했습니다: {error}</AlertRow> : <Panel title="공급처별 Lead Time" meta={`${rows.length}건`}><div className="data-table-wrap"><table className="data-table"><thead><tr><th>공급처</th><th>표본</th><th>P50</th><th>P80</th><th>P90</th><th>확정값</th><th>Effective</th><th>출처</th><th>변경</th></tr></thead><tbody>{rows.map((row) => <tr key={row.supplierId}><td><strong>{row.supplierName}</strong><br /><span className="muted">{row.supplierId} · {row.country}</span></td><td>{row.sampleCount}</td><td>{row.p50 ?? <EmptyValue reasonCode="INSUFFICIENT_SAMPLE" />}</td><td>{row.p80 ?? <EmptyValue reasonCode="INSUFFICIENT_SAMPLE" />}</td><td>{row.p90 ?? <EmptyValue reasonCode="INSUFFICIENT_SAMPLE" />}</td><td>{row.confirmedLeadTime ?? <EmptyValue reasonCode="NO_CONFIRMED_LEADTIME" />}</td><td>{row.effectiveLeadTime ?? <EmptyValue reasonCode="NO_LEADTIME" />}</td><td><Badge status={row.effectiveLeadTime === null ? 'CALCULATION_UNAVAILABLE' : 'SAFE'} label={row.source} /></td><td><form action={updateLeadtime} className="inline-form"><input type="hidden" name="supplier_id" value={row.supplierId} /><input name="lead_time" type="number" min="1" placeholder="일수" defaultValue={row.confirmedLeadTime ?? ''} /><input name="reason" required placeholder="변경 사유" /><button className="button" type="submit">저장</button></form></td></tr>)}</tbody></table></div></Panel>}
  </div>;
}
