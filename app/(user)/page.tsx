import Link from 'next/link';
import PageHeader from '@/components/shell/page-header';
import InsightBanner from '@/components/ui/insight-banner';
import Panel from '@/components/ui/panel';

export default function DashboardPage() {
  return <div className="page-content"><PageHeader title="SCM 대시보드" description="리드타임과 재고 소진 위험 분석 화면으로 이동합니다." /><div className="grid grid-2"><Panel title="리드타임 분석"><p>공급처별 마스터와 실제 P80 리드타임의 격차를 확인합니다.</p><Link className="button" href="/analysis/leadtime">리드타임 격차 보기</Link></Panel><Panel title="재고 소진 위험"><p>가용 재고와 일평균 사용량으로 소진 시점을 점검합니다.</p><Link className="button button-primary" href="/analysis/stockout">소진 위험 보기</Link></Panel></div><div style={{ marginTop: 'var(--space-4)' }}><InsightBanner>모든 분석 화면은 analytics 뷰의 결과만 표시합니다. 계산 기준은 화면이 아니라 데이터 계층에서 관리합니다.</InsightBanner></div></div>;
}
