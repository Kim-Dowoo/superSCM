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

function display(value: number | null | undefined, unit = '', reasonCode = 'CALCULATION_UNAVAILABLE') { return value == null ? <EmptyValue reasonCode={reasonCode} /> : `${value.toLocaleString()}${unit}`; }
function statusOf(status: StockoutRisk['riskStatus']): StatusTone { return status === 'UNKNOWN' ? 'CALCULATION_UNAVAILABLE' : status; }

const columns: DataColumn<StockoutRisk>[] = [
  { key: 'itemId', label: '품목', render: (row) => <><strong>{row.itemId}</strong><br />{row.itemName}</> }, { key: 'supplierId', label: '공급처' },
  { key: 'beginningInventory', label: '기초 재고', align: 'right', render: (row) => display(row.currentStock) },
  { key: 'scheduledReceipt', label: '예정 입고', align: 'right', render: (row) => display(row.inboundQty) },
  { key: 'confirmedSalesOrder', label: '확정수주', align: 'right', render: (row) => display(row.confirmedSalesOrder) },
  { key: 'softAllocation', label: 'Soft Allocation', align: 'right', render: (row) => display(row.softAllocation) },
  { key: 'forecastDemand', label: 'Forecast 수요', align: 'right', render: (row) => display(row.forecastDemand, '', row.reason ?? 'NO_FORECAST') },
  { key: 'daysOfSupply', label: 'Days of Supply', align: 'right', render: (row) => display(row.daysOfSupply, '일') },
  { key: 'stockoutPeriod', label: '소진 기간', render: (row) => row.stockoutPeriod ?? <EmptyValue reasonCode={row.reason ?? 'NO_STOCKOUT'} /> },
  { key: 'riskStatus', label: '상태', render: (row) => <Badge status={statusOf(row.riskStatus)} /> },
  { key: 'reason', label: '사유 코드', render: (row) => row.reason ? <EmptyValue reasonCode={row.reason} /> : '—' },
];

export default async function StockoutPage() {
  const [riskResult, kpiResult] = await Promise.all([getStockoutRisk(), getStockoutKpi()]);
  const error = riskResult.error ?? kpiResult.error;
  const kpi = kpiResult.data;
  return <div className="page-content"><PageHeader title="재고 소진 위험" description="Forecast, 입고 예정과 확정수주를 반영한 기간별 재고 Projection입니다." />
    {error ? <AlertRow tone="critical">조회에 실패했습니다: {error}</AlertRow> : <><div className="grid grid-4"><KpiCard label="분석 품목" value={kpi?.nItems ?? <EmptyValue reasonCode="KPI_UNAVAILABLE" />} foot="전체 품목" /><KpiCard label="소진 위험" value={kpi?.nCritical ?? <EmptyValue reasonCode="KPI_UNAVAILABLE" />} foot={<Badge status="CRITICAL" label="결품 전 대응 필요" />} /><KpiCard label="주의" value={kpi?.nWarning ?? <EmptyValue reasonCode="KPI_UNAVAILABLE" />} foot={<Badge status="WARNING" />} /><KpiCard label="계산 불가" value={kpi?.nCalculationUnavailable ?? <EmptyValue reasonCode="KPI_UNAVAILABLE" />} foot={<Badge status="CALCULATION_UNAVAILABLE" />} /></div><div style={{ marginTop: 'var(--space-4)' }}><Panel title="품목별 Inventory Projection" meta={`${riskResult.rows.length}건`}><DataTable columns={columns} rows={riskResult.rows} rowKey={(row) => row.itemId} empty={<AlertRow>표시할 데이터가 없습니다.</AlertRow>} /></Panel></div></>}
  </div>;
}
