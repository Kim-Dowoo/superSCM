# STEP6 Forecast Engine 구현 계획

**목표:** 학습 데이터만 사용하는 SQL Baseline Forecast 실행과 모델/버전/결과 이력을 구현해 STEP7 Backtest의 재현 가능한 입력을 제공한다.

**구조:** `core.model_config`에서 정의를 관리하고 실행 시 `core.model_version`으로 snapshot을 남긴다. `core.run_baseline_forecast()`가 `core.v_train_demand` 기반 모델별 결과를 `core.forecast_result`에 저장하고, analytics view가 화면과 이후 Backtest에 제공한다.

**제약:** test actual/raw 직접 조회 금지, 모델 파라미터 코드 하드코딩 금지, null을 0으로 치환 금지, 기존 run 결과 덮어쓰기 금지, ADMIN만 모델 변경/실행 가능.

## 작업

1. `20260828000500_forecast_engine.sql`에서 model registry/version/run/result 테이블, Baseline SQL 함수, analytics views, RLS/grants를 추가한다.
2. `lib/scm-model.ts`, `lib/scm.ts`에 Forecast 결과 조회 타입/함수를 추가한다.
3. `/admin/forecast-models`, `/admin/forecast-runs` 화면을 추가한다.
4. Baseline 계산 규칙과 데이터 부족/null 처리를 테스트하고 `npm test`, `npm run build`를 실행한다.
