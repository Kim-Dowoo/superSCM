import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import AlertRow from '@/components/ui/alert-row';
import DemandProfileTable from '@/components/analysis/demand-profile-table';
import { getDemandProfiles } from '@/lib/scm';

export const dynamic = 'force-dynamic';
export default async function DemandProfilePage() {
  const { rows, error } = await getDemandProfiles();
  return <div className="page-content"><PageHeader title="SKU Demand Profile" description="학습 구간의 수요 특성을 분류해 Forecast 모델 후보를 준비합니다." /><Panel>{error ? <AlertRow tone="critical">조회에 실패했습니다: {error}</AlertRow> : rows.length === 0 ? <AlertRow>표시할 데이터가 없습니다. 학습 기간과 core.v_train_demand를 확인하세요.</AlertRow> : <DemandProfileTable rows={rows} />}</Panel></div>;
}
