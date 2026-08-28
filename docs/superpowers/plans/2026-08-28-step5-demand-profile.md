# STEP5 SKU Demand Profile 구현 계획

**목표:** `core.v_train_demand`의 학습 기간만으로 SKU별 수요 패턴을 계산하고 STEP6 Forecast 모델 선택에 사용할 analytics 결과를 제공한다.

**구조:** SQL에서 학습 기간 월별 grid와 통계를 계산해 `analytics.v_sku_demand_profile`, `analytics.v_demand_profile_kpi`로 노출한다. Next.js는 analytics view를 조회하고 저장된 결과를 필터링/표시한다.

**제약:** raw.usage_history 및 core.v_test_actual 직접 조회 금지, Syntetos–Boylan–Croston 기준 고정, 데이터 부족 시 null+reason_code, React에서 통계 재계산 금지.

## 작업

1. `20260828000400_demand_profile.sql`에서 train 기간 월별 grid, ADI/CV²/trend/recent/peak/seasonality, KPI, RLS/grant를 추가한다.
2. `lib/scm-model.ts`와 `lib/scm.ts`에 profile 타입과 analytics 조회 함수를 추가한다.
3. `/analysis/demand-profile` 서버 페이지와 필터 클라이언트를 추가한다.
4. 통계 분류·데이터 부족·test 격리 계약 테스트를 추가하고 `npm test`, `npm run build`를 실행한다.
