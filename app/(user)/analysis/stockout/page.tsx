import AlertRow from '@/components/ui/alert-row';
import Badge, { type StatusTone } from '@/components/ui/badge';
import DataTable, { type DataColumn } from '@/components/ui/data-table';
import EmptyValue from '@/components/ui/empty-value';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import PageHeader from '@/components/shell/page-header';
import { getStockoutKpi, getStockoutRisk } from '@/lib/scm';
import type { StockoutRisk } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

function display(value: number | null, unit = '', reasonCode = 'CALCULATION_UNAVAILABLE') { return value === null ? <EmptyValue reasonCode={reasonCode} /> : `${value.toLocaleString()}${unit}`; }
function statusOf(status: StockoutRisk['riskStatus']): StatusTone { return status === 'SAFE' ? 'SAFE' : status === 'CRITICAL' ? 'CRITICAL' : 'CALCULATION_UNAVAILABLE'; }

const columns: DataColumn<StockoutRisk>[] = [
  { key: 'itemId', label: '품목', render: (row) => <><strong>{row.itemId}</strong><br />{row.itemName}</> }, { key: 'supplierId', label: '공급처' },
  { key: 'availableQty', label: '가용재고', align: 'right', render: (row) => display(row.availableQty) },
  { key: 'dailyUsageAvg', label: '일평균 사용량', align: 'right', render: (row) => display(row.dailyUsageAvg, '', row.reason ?? 'NO_USAGE') },
  { key: 'plannedLeadTime', label: '계획 LT', align: 'right', render: (row) => display(row.plannedLeadTime, '일', row.reason ?? 'NO_LEADTIME') },
  { key: 'stockoutDays', label: '소진 예상', align: 'right', render: (row) => display(row.stockoutDays, '일', row.reason ?? 'CALCULATION_UNAVAILABLE') },
  { key: 'riskStatus', label: '상태', render: (row) => <Badge status={statusOf(row.riskStatus)} /> },
  { key: 'reason', label: '사유 코드', render: (row) => row.reason ? <EmptyValue reasonCode={row.reason} /> : '—' },
];

export default async function StockoutPage() {
  const [riskResult, kpiResult] = await Promise.all([getStockoutRisk(), getStockoutKpi()]);
  const error = riskResult.error ?? kpiResult.error;
  const kpi = kpiResult.data;
  return <div className="page-content"><PageHeader title="재고 소진 위험" description="가용재고와 사용량을 바탕으로 품목별 소진 시점을 점검합니다." />
    {error ? <AlertRow tone="critical">조회에 실패했습니다: {error}</AlertRow> : <><div className="grid grid-4"><KpiCard label="분석 품목" value={kpi?.nItems ?? <EmptyValue reasonCode="KPI_UNAVAILABLE" />} foot="전체 품목" /><KpiCard label="소진 임박" value={kpi?.nCritical ?? <EmptyValue reasonCode="KPI_UNAVAILABLE" />} foot={<Badge status="CRITICAL" label="재고 소진 위험" />} /><KpiCard label="30일 내 소진" value={kpi?.nWithin30d ?? <EmptyValue reasonCode="KPI_UNAVAILABLE" />} foot="예상 소진 기준" /><KpiCard label="평균 소진 일수" value={display(kpi?.avgStockoutDays ?? null, '일')} foot="산출 가능한 품목 기준" /></div><div style={{ marginTop: 'var(--space-4)' }}><Panel title="품목별 소진 위험" meta={`${riskResult.rows.length}건`}><DataTable columns={columns} rows={riskResult.rows} rowKey={(row) => row.itemId} empty={<AlertRow>표시할 데이터가 없습니다.</AlertRow>} /></Panel></div></>}
  </div>;
}
