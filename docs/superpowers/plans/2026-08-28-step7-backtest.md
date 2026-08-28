# STEP7 Backtest·Champion·Model Comparison 구현 계획

**목표:** 저장된 Forecast Result와 검증 Actual만으로 모델 성능과 SKU별 Champion을 계산하고, 재실행 없이 비교 화면에서 조회한다.

**구조:** `core.backtest_run`, `core.model_performance`, `core.champion_model`에 실행·성능·선정 이력을 저장한다. SQL RPC가 WAPE/MAPE/Bias/RMSE/MAE, rank, AUTO Champion을 계산하며 analytics view와 공통 차트 wrapper가 결과를 소비한다.

**제약:** raw 직접 조회 금지, Forecast 재실행 금지, null을 0으로 치환 금지, ADMIN만 Backtest/수동 Champion 변경 가능.

## 작업

1. `20260828000600_backtest_champion.sql`에서 설정 확장, Backtest/성능/Champion 테이블, 지표 SQL 함수, analytics views, RLS/RPC를 추가한다.
2. `lib/scm-model.ts`, `lib/scm.ts`에 비교 데이터 타입과 조회 함수를 추가한다.
3. 공통 `components/chart/forecast-overlay-chart.tsx`와 `/analysis/model-comparison` 화면을 추가한다.
4. metric·rank·Champion·null 처리 테스트를 추가하고 `npm test`, `npm run build`를 실행한다.
