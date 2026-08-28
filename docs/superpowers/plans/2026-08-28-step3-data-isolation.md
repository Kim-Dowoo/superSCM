# STEP3 데이터 모델·학습 검증 격리 구현 계획

**목표:** STEP4~6에서 사용할 raw 입력 구조와 정책/Forecast 기간을 확정하고 train/test 데이터 누수를 DB 계층에서 차단한다.

**구조:** 기존 migration을 보존하고 신규 migration으로 raw/core/analytics 객체를 추가한다. 기간은 `core.forecast_setting`에서 읽으며 `core.v_train_demand`, `core.v_test_actual`이 raw 사용 이력의 유일한 학습·검증 진입점이 된다. 관리자 화면은 `analytics.v_data_coverage`와 `analytics.v_forecast_settings`만 조회한다.

**제약:** raw 직접 조회 금지, 날짜 하드코딩 금지, null을 0으로 치환 금지, 기존 계산 뷰 drop/recreate 금지, anon 차단과 ADMIN 정책 변경 RLS 유지, 순수 CSS 유지.

## 작업

1. 현재 raw/core/analytics 테이블과 컬럼을 확인하고 기존 forecast 설정 존재 여부를 점검한다.
2. `20260828000200_step3_data_model.sql`에서 raw 신규 테이블·적재 추적 컬럼·core 정책/설정 테이블·train/test/coverage view·RLS·grants를 추가한다.
3. `lib/scm.ts`에 관리자 검증용 analytics 조회 함수를 추가하고 화면에서 raw를 직접 사용하지 않는다.
4. `/admin/forecast-settings` 화면을 만들어 기간·granularity·격리 상태·정책값을 표시한다.
5. train/test 범위 배타성, 날짜 하드코딩 부재, null 보존을 테스트하고 `npm test`, `npm run build`를 실행한다.
