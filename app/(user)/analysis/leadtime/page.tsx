import AlertRow from '@/components/ui/alert-row';
import Badge from '@/components/ui/badge';
import DataTable, { type DataColumn } from '@/components/ui/data-table';
import EmptyValue from '@/components/ui/empty-value';
import Panel from '@/components/ui/panel';
import PageHeader from '@/components/shell/page-header';
import { getLeadtimeGap } from '@/lib/scm';
import type { LeadtimeGap } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

function numberOrEmpty(value: number | null, unit: string) { return value === null ? <EmptyValue reasonCode="NO_LEADTIME" /> : `${value.toLocaleString()}${unit}`; }

const columns: DataColumn<LeadtimeGap>[] = [
  { key: 'supplier', label: '공급처' }, { key: 'country', label: '국가' },
  { key: 'masterLeadTime', label: '마스터', align: 'right', render: (row) => numberOrEmpty(row.masterLeadTime, '일') },
  { key: 'sampleCount', label: '표본수', align: 'right', render: (row) => row.sampleCount.toLocaleString() },
  { key: 'actualAverage', label: '실적평균', align: 'right', render: (row) => numberOrEmpty(row.actualAverage, '일') },
  { key: 'p80', label: 'P80', align: 'right', render: (row) => numberOrEmpty(row.p80, '일') },
  { key: 'gap', label: '판정', render: (row) => row.gap === null ? <EmptyValue reasonCode="NO_LEADTIME" /> : <Badge status={row.gap > 0 ? 'CRITICAL' : 'SAFE'} label={row.gap > 0 ? `실제 +${row.gap}일` : '기준 충족'} /> },
];

export default async function LeadtimePage() {
  const { rows, error } = await getLeadtimeGap();
  return <div className="page-content"><PageHeader title="리드타임 격차" description="공급처별 마스터 리드타임과 실제 P80 실적을 비교합니다." />
    <Panel title="공급처별 리드타임" meta="격차 = P80 − 마스터">
      {error ? <AlertRow tone="critical">조회에 실패했습니다: {error}</AlertRow> : <DataTable columns={columns} rows={rows} rowKey={(row, index) => `${row.supplier}-${index}`} empty={<AlertRow>표시할 데이터가 없습니다. Exposed schemas와 analytics.v_leadtime_gap을 확인하세요.</AlertRow>} />}
    </Panel></div>;
}
