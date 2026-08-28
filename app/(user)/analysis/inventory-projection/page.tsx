import AlertRow from '@/components/ui/alert-row';
import EmptyValue from '@/components/ui/empty-value';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import DataTable, { type DataColumn } from '@/components/ui/data-table';
import { getInventoryProjection } from '@/lib/scm';
import type { InventoryProjection } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';
const value = (n: number | null) => n == null ? <EmptyValue reasonCode="CALCULATION_UNAVAILABLE" /> : n.toLocaleString();
const columns: DataColumn<InventoryProjection>[] = [
  { key: 'itemId', label: 'SKU', render: (r) => <><strong>{r.itemId}</strong><br />{r.itemName}</> },
  { key: 'period', label: '기간' },
  { key: 'beginningInventory', label: '기초 재고', align: 'right', render: (r) => value(r.beginningInventory) },
  { key: 'scheduledReceipt', label: '예정 입고', align: 'right', render: (r) => value(r.scheduledReceipt) },
  { key: 'confirmedSalesOrder', label: '확정수주', align: 'right', render: (r) => value(r.confirmedSalesOrder) },
  { key: 'softAllocation', label: 'Soft Allocation', align: 'right', render: (r) => value(r.softAllocation) },
  { key: 'forecastDemand', label: 'Forecast 수요', align: 'right', render: (r) => r.forecastDemand == null ? <EmptyValue reasonCode={r.reasonCode ?? 'NO_FORECAST'} /> : r.forecastDemand.toLocaleString() },
  { key: 'endingProjectedInventory', label: '기말 Projection', align: 'right', render: (r) => value(r.endingProjectedInventory) },
  { key: 'reasonCode', label: '사유', render: (r) => r.reasonCode ? <EmptyValue reasonCode={r.reasonCode} /> : '—' },
];

export default async function InventoryProjectionPage() {
  const result = await getInventoryProjection();
  return <div className="page-content"><PageHeader title="Inventory Projection" description="현재 재고와 예정 입고·확정수주·Forecast를 기간별로 연결합니다." />
    {result.error ? <AlertRow tone="critical">조회에 실패했습니다: {result.error}</AlertRow> : <Panel title="기간별 재고 Projection" meta={`${result.rows.length}건`}><DataTable columns={columns} rows={result.rows} rowKey={(r, i) => `${r.itemId}-${r.period}-${i}`} empty={<AlertRow>표시할 데이터가 없습니다.</AlertRow>} /></Panel>}
  </div>;
}
