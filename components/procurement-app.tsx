'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, BarChart3, Boxes, Check, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, FileSpreadsheet, FileText, Gauge, LineChart, Layers3, PackageCheck, Settings2, ShoppingCart, Upload, Workflow, Wrench } from 'lucide-react';
import DashboardStep from '@/components/workflow/dashboard-step';
import LogoutButton from '@/components/auth/logout-button';
import DemandStep from '@/components/workflow/demand-step';
import SupplyStep from '@/components/workflow/supply-step';
import MasterStep from '@/components/workflow/master-step';
import CalculationStep from '@/components/workflow/calculation-step';
import ReportStep from '@/components/workflow/report-step';

export type StepId = 'dashboard' | 'demand' | 'supply' | 'master' | 'calculation' | 'report';
type AnalysisBranchId = 'leadtime' | 'stockout' | 'demand-profile' | 'model-comparison';

const steps: { id: StepId; label: string; short: string; kicker: string; icon: typeof Gauge }[] = [
  { id: 'dashboard', label: '전체 현황', short: '현황', kicker: 'OVERVIEW', icon: Gauge },
  { id: 'demand', label: '수요 확정', short: '수요', kicker: 'DEMAND', icon: BarChart3 },
  { id: 'supply', label: '재고·공급', short: '재고', kicker: 'SUPPLY', icon: Boxes },
  { id: 'master', label: '마스터 검증', short: '기준', kicker: 'MASTER DATA', icon: Settings2 },
  { id: 'calculation', label: '발주량 계산', short: '계산', kicker: 'CALCULATION', icon: ShoppingCart },
  { id: 'report', label: '보고자료', short: '보고', kicker: 'EXECUTIVE REPORT', icon: FileText },
];

export default function ProcurementApp() {
  const [active, setActive] = useState<StepId>('dashboard');
  const [analysisBranch, setAnalysisBranch] = useState<AnalysisBranchId | null>(null);
  const currentIndex = steps.findIndex((step) => step.id === active);
  const current = steps[currentIndex];
  const completedCount = Math.max(0, currentIndex);
  const navigate = (index: number) => setActive(steps[Math.max(0, Math.min(index, steps.length - 1))].id);
  const goNext = () => navigate(currentIndex + 1);
  const goBack = () => navigate(currentIndex - 1);

  const page = useMemo(() => {
    const props = { onNext: goNext, onBack: goBack };
    switch (active) {
      case 'demand': return <DemandStep {...props} />;
      case 'supply': return <SupplyStep {...props} />;
      case 'master': return <MasterStep {...props} />;
      case 'calculation': return <CalculationStep {...props} />;
      case 'report': return <ReportStep {...props} />;
      default: return <><DashboardStep onStart={goNext} onOpenStep={setActive} onOpenAnalysis={setAnalysisBranch} />{analysisBranch ? <section className="analysis-branch-panel"><div><span className="eyebrow">ANALYSIS BRANCH</span><h2>{analysisBranch === 'leadtime' ? '리드타임 분석' : analysisBranch === 'stockout' ? '소진 위험 분석' : analysisBranch === 'demand-profile' ? 'SKU 수요 프로파일' : 'Model Comparison'}</h2><p>선택한 분석 브랜치를 현재 화면 아래에 열었습니다. 상세 데이터 화면은 저장된 analytics 결과를 사용합니다.</p></div><Link className="button primary" href={`/analysis/${analysisBranch}`}>상세 분석 열기 <ArrowRight size={14} /></Link></section> : null}</>;
    }
  }, [active, analysisBranch]);

  return (
    <div className="app-shell legacy-workflow-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">OP</div>
          <div className="brand-copy"><strong>월간 발주계획</strong><span>Procurement Planning</span></div>
        </div>
        <div className="nav-label">WORKFLOW</div>
        <nav className="nav-list" aria-label="업무 단계">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isDone = index < currentIndex;
            return <button key={step.id} className={`nav-button ${active === step.id ? 'active' : ''} ${isDone ? 'complete' : ''}`} onClick={() => navigate(index)} aria-current={active === step.id ? 'step' : undefined}>
              <span className="nav-number">{isDone ? <Check size={12} strokeWidth={3} /> : <Icon size={13} />}</span>
              <span>{step.label}</span>
            </button>;
          })}
        </nav>
        <div className="nav-label nav-label-gap">ANALYSIS</div>
        <nav className="nav-list" aria-label="분석 화면">
          <Link href="/analysis/leadtime" className="nav-button nav-link">
            <span className="nav-number"><LineChart size={13} /></span>
            <span>분석 화면</span>
            <ChevronRight size={13} className="nav-link-arrow" />
          </Link>
        </nav>
        <div className="sidebar-foot"><b>2026년 09월 발주계획</b><br />로컬 프로토타입 · Phase 1<br />상세 계산·저장은 다음 단계에서 연결됩니다.</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div><div className="eyebrow">MONTHLY PROCUREMENT CONTROL</div><h1>{current.label}</h1></div>
          <div className="top-meta"><span className="local-badge">LOCAL PROTOTYPE</span><span>기준월도 <b>2026.09</b></span><LogoutButton /></div>
        </header>
        <div className="content">
          <div className="progress-wrap">
            <div className="progress-track">
              {steps.map((step, index) => <div key={step.id} className="progress-step-wrap" style={{ display: 'contents' }}>
                <button className={`progress-step ${index === currentIndex ? 'active' : ''} ${index < currentIndex ? 'done' : ''}`} onClick={() => navigate(index)}>
                  <span className="progress-kicker">{step.kicker}</span>
                  <span className="progress-dot">{index < currentIndex ? <Check size={12} strokeWidth={3} /> : index + 1}</span>
                  <span className="progress-label">{step.label}</span>
                </button>
                {index < steps.length - 1 && <span className="progress-line" />}
              </div>)}
            </div>
            <div className="progress-caption"><span>전체 업무 플로우</span><span>{completedCount} / {steps.length - 1} 단계 진행</span></div>
          </div>
          {page}
        </div>
      </main>
    </div>
  );
}

export const Icons = { AlertTriangle, ClipboardCheck, CircleDollarSign, FileSpreadsheet, Layers3, PackageCheck, Upload, Workflow, Wrench };
