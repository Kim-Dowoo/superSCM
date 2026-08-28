import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import { requireAdmin } from '@/lib/auth';
import { getForecastSettings } from '@/lib/scm';

export const dynamic = 'force-dynamic';

function dateValue(value: string | null, reasonCode: string) {
  return value ? value : <EmptyValue reasonCode={reasonCode} />;
}

export default async function ForecastSettingsPage() {
  await requireAdmin();
  const { data, error } = await getForecastSettings();

  return (
    <div className="page-content">
      <PageHeader title="Forecast 설정 검증" description="정책과 학습·검증 기간이 데이터 계층에서 격리되어 있는지 확인합니다." />
      {error ? <Panel><p className="text-critical">조회에 실패했습니다: {error}</p></Panel> : !data ? <Panel><p>설정 데이터가 없습니다.</p></Panel> : (
        <div className="grid grid-2">
          <Panel title="기간 및 격리 상태">
            <dl className="detail-list">
              <div><dt>전체 데이터 기간</dt><dd>{dateValue(data.dataStart, 'NO_DATA')} ~ {dateValue(data.dataEnd, 'NO_DATA')}</dd></div>
              <div><dt>학습 기간</dt><dd>{dateValue(data.trainStart, 'TRAIN_START_UNSET')} ~ {dateValue(data.trainEnd, 'TRAIN_END_UNSET')}</dd></div>
              <div><dt>검증 기간</dt><dd>{dateValue(data.testStart, 'TEST_START_UNSET')} ~ {dateValue(data.testEnd, 'TEST_END_UNSET')}</dd></div>
              <div><dt>Granularity</dt><dd>{data.granularity}</dd></div>
              <div><dt>학습 행 수</dt><dd>{data.trainRowCount}</dd></div>
              <div><dt>검증 행 수</dt><dd>{data.testRowCount}</dd></div>
              <div><dt>학습 구간</dt><dd><Badge status={data.trainWindowOk ? 'SAFE' : 'CRITICAL'} label={data.trainWindowOk ? '정상' : '확인 필요'} /></dd></div>
              <div><dt>검증 구간</dt><dd><Badge status={data.testWindowOk ? 'SAFE' : 'CRITICAL'} label={data.testWindowOk ? '정상' : '확인 필요'} /></dd></div>
            </dl>
          </Panel>
          <Panel title="정책 적용 현황">
            <dl className="detail-list">
              <div><dt>정책 설정 수</dt><dd>{data.policyCount}</dd></div>
              <div><dt>활성 이상치 규칙</dt><dd>{data.activeOutlierRuleCount}</dd></div>
              <div><dt>품목 정책 수</dt><dd>{data.itemPolicyCount}</dd></div>
              <div><dt>학습 데이터 뷰</dt><dd><code>core.v_train_demand</code></dd></div>
              <div><dt>검증 Actual 뷰</dt><dd><code>core.v_test_actual</code></dd></div>
            </dl>
          </Panel>
        </div>
      )}
    </div>
  );
}
