import AnalysisFrame from '@/components/analysis/analysis-frame';
import DataTable, { formatNumber, type Column } from '@/components/analysis/data-table';
import ReasonBadge from '@/components/analysis/reason-badge';
import RiskBadge from '@/components/analysis/risk-badge';
import { getStockoutKpi, getStockoutRisk } from '@/lib/scm';
import type { StockoutRisk } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

const columns: Column<StockoutRisk>[] = [
  { key: 'itemId', label: '품목', render: (row) => <><strong>{row.itemId}</strong><br /><span className="muted">{row.itemName}</span></> },
  { key: 'supplierId', label: '공급처' },
  { key: 'availableQty', label: '가용재고', align: 'right', render: (row) => formatNumber(row.availableQty) },
  { key: 'dailyUsageAvg', label: '일평균 사용량', align: 'right', render: (row) => formatNumber(row.dailyUsageAvg) },
  { key: 'plannedLeadTime', label: '계획 LT', align: 'right', render: (row) => formatNumber(row.plannedLeadTime, '일') },
  { key: 'stockoutDays', label: '소진 예상', align: 'right', render: (row) => formatNumber(row.stockoutDays, '일') },
  { key: 'riskStatus', label: '상태', render: (row) => <RiskBadge status={row.riskStatus} /> },
  { key: 'reason', label: '사유', render: (row) => <ReasonBadge reason={row.reason} /> },
];

export default async function StockoutAnalysisPage() {
  const [riskResult, kpiResult] = await Promise.all([getStockoutRisk(), getStockoutKpi()]);
  const error = riskResult.error ?? kpiResult.error;

  if (error) {
    return <AnalysisFrame title="재고 소진 위험" description="가용재고와 사용량을 바탕으로 소진 시점을 점검합니다."><div className="card"><p>조회에 실패했습니다: {error}</p></div></AnalysisFrame>;
  }

  const kpi = kpiResult.data;
  return (
    <AnalysisFrame title="재고 소진 위험" description="가용재고와 사용량을 바탕으로 소진 시점을 점검합니다.">
      <div className="grid grid-4">
        <div className="card"><p className="metric-label">분석 품목</p><p className="metric-value">{kpi?.nItems ?? 0}</p><p className="metric-foot">전체 품목</p></div>
        <div className="card"><p className="metric-label">소진 임박</p><p className="metric-value text-danger">{kpi?.nCritical ?? 0}</p><p className="metric-foot">재고 소진 위험</p></div>
        <div className="card"><p className="metric-label">30일 내 소진</p><p className="metric-value">{kpi?.nWithin30d ?? 0}</p><p className="metric-foot">예상 소진 기준</p></div>
        <div className="card"><p className="metric-label">평균 소진 일수</p><p className="metric-value">{formatNumber(kpi?.avgStockoutDays ?? null, '일')}</p><p className="metric-foot">산출 가능한 품목 기준</p></div>
      </div>
      <div className="section">
        <div className="section-heading"><div><span className="eyebrow">RISK REGISTER</span><h3>품목별 소진 위험</h3></div><span className="muted">{riskResult.rows.length}건</span></div>
        <DataTable columns={columns} rows={riskResult.rows} rowKey={(row) => row.itemId} />
      </div>
    </AnalysisFrame>
  );
}
