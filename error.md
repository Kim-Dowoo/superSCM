# 오류 기록

## 2026-08-28 — 사용자 활성 상태가 항상 비활성으로 저장됨

- 증상: 사용자 관리에서 비활성 계정을 활성으로 선택해도 변경 Action이 `false`를 받았습니다.
- 원인: 폼의 hidden `active=false`가 체크박스 `active=true`보다 먼저 전송됐고, `FormData.get('active')`는 첫 번째 값만 반환했습니다.
- 해결: hidden 입력을 제거하고, 서버 Action에서 체크박스 존재 여부인 `FormData.has('active')`로 활성 상태를 판별합니다.
- 검증: 동일 이름 값 `false`, `true`를 순서대로 넣은 FormData에서 `get('active')`가 `false`임을 재현한 뒤 수정했습니다. 수정 후에는 체크됨일 때만 `active` 필드가 전송됩니다.

## 2026-08-28 — SQL Editor에서 관리자 권한 부여 RPC가 42501로 실패함

- 증상: `core.admin_update_user(...)` 실행 시 `관리자만 사용자 권한을 변경할 수 있습니다.` 오류가 발생했습니다.
- 원인: Supabase SQL Editor에는 로그인한 JWT 세션이 없어 `auth.uid()`가 NULL입니다. 따라서 RPC의 `core.is_admin()` 검사를 통과할 수 없습니다.
- 해결: 최초 활성 ADMIN이 없는 경우 `sql/03-admin-user-grant.sql` 하단의 부트스트랩 `DO` 블록을 SQL Editor에서 1회 실행합니다. 이후에는 앱에 ADMIN으로 로그인한 상태에서 RPC 또는 관리자 화면을 사용합니다.
- 주의: 이미 활성 ADMIN이 있으면 부트스트랩 블록은 실행을 중단하고 RPC 사용을 안내합니다.

## 2026-08-28 — import 검증 테스트에서 중첩 모듈을 찾지 못함

- 증상: `lib/import/validate.test.ts` 실행 시 `ERR_MODULE_NOT_FOUND`로 `schema` 모듈을 찾지 못했습니다.
- 원인: Node의 TypeScript ESM 테스트 실행에서는 중첩 디렉터리 상대 import에 확장자가 필요합니다.
- 해결: import 모듈과 테스트의 상대 경로에 `.ts` 확장자를 명시했습니다.
- 검증: `npm test`에서 import 검증 테스트를 포함해 전체 테스트가 통과해야 합니다.

## 2026-08-28 — Server Action form action 반환 타입 오류

- 증상: `form action`에 전달한 Action이 `{ ok: boolean }`을 반환해 TypeScript 오류가 발생했습니다.
- 원인: React Server Action form handler는 `void` 또는 `Promise<void>` 반환 타입을 요구합니다.
- 해결: import/rollback 확인 Action이 작업만 수행하고 `Promise<void>`를 반환하도록 변경했습니다.

## 2026-08-28 — analytics.v_sku_demand_profile을 schema cache에서 찾지 못함

- 증상: Demand Profile 화면에서 `Could not find the table 'analytics.v_sku_demand_profile' in the schema cache`가 발생했습니다.
- 원인: STEP5 migration이 Supabase 프로젝트에 아직 적용되지 않았거나, migration 실행 중 `period_count` 집계 컬럼 오류로 중단된 상태입니다. 적용 후 PostgREST schema cache가 갱신되지 않은 경우에도 같은 메시지가 표시됩니다.
- 해결: 수정된 `20260828000400_demand_profile.sql`을 SQL Editor에서 전체 실행하고, 성공 후 `notify pgrst, 'reload schema';`를 실행합니다. 이후 `select * from analytics.v_sku_demand_profile limit 1;`로 객체를 확인합니다.
- 검증: `analytics.v_demand_profile_kpi`도 함께 조회하고 Supabase API Exposed schemas에 `analytics`가 포함되어 있는지 확인합니다.

## 2026-08-28 — Demand Profile View가 실제로 생성되지 않음

- 증상: SQL Editor에서 `select * from analytics.v_sku_demand_profile limit 1;` 실행 시 `relation "analytics.v_sku_demand_profile" does not exist`가 표시됩니다.
- 원인: 조회문만 실행했으며 STEP5 migration 전체가 아직 데이터베이스에 적용되지 않은 상태입니다.
- 해결: `supabase/migrations/20260828000400_demand_profile.sql` 전체를 SQL Editor에 붙여넣고 모두 실행한 뒤 `notify pgrst, 'reload schema';`를 실행합니다. migration 실행 중 다른 오류가 나오면 그 첫 번째 오류부터 해결해야 합니다.

## 2026-08-28 — STEP5 실행 시 core.forecast_setting이 없음

- 증상: STEP5 migration 실행 중 `relation "core.forecast_setting" does not exist`가 발생했습니다.
- 원인: STEP5는 STEP3에서 생성한 `core.forecast_setting`, `core.v_train_demand`, `core.v_item_master`를 전제로 합니다. STEP3 migration보다 먼저 실행했거나 STEP3가 아직 Supabase에 적용되지 않았습니다.
- 해결: 먼저 `20260828000200_step3_data_model.sql` 전체를 실행해 기반 테이블/뷰를 만든 다음, `20260828000400_demand_profile.sql`을 실행합니다. 마지막에 `notify pgrst, 'reload schema';`를 실행합니다.

## 2026-08-28 — Vercel에서 기존 데이터 기반 화면이 보이지 않음

- 증상: 예전에는 Vercel에서 데이터 기반 진척/분석 화면이 보였지만 현재는 화면이 보이지 않거나 로그인 화면으로 이동합니다.
- 확인: Vercel `super-scm` 최신 Production 배포는 `READY`이며 최근 7일 런타임 오류는 없습니다. 보호된 `/analysis/*` 요청은 인증되지 않은 경우 로그인 경로로 리다이렉트됩니다.
- 원인: STEP2 인증/RBAC 적용 이후 `middleware.ts`가 세션과 `core.app_user.active`를 확인합니다. Vercel 브라우저에 Supabase 로그인 쿠키가 없거나, 로그인 계정의 `core.app_user` 행이 없거나 비활성 상태이면 분석 데이터 조회 전에 `/login`으로 이동합니다. 데이터 삭제나 배포 실패로 판단할 근거는 확인되지 않았습니다.
- 해결: Vercel Production URL에서 활성 Supabase 계정으로 로그인하고, 계정이 `core.app_user`에 `active=true`로 존재하는지 확인합니다. 최초 ADMIN이 없으면 `sql/03-admin-user-grant.sql`의 부트스트랩 절차를 SQL Editor에서 1회 실행합니다. 로그인 후에도 데이터가 비어 있으면 Supabase API Exposed schemas(`core`, `analytics`)와 STEP3~STEP7 migration 적용 여부를 확인합니다.
- 검증: Production 최신 커밋 `431c67f` 배포 상태 `READY`, 런타임 오류 0건, 비로그인 `/analysis/leadtime` 요청이 로그인 보호로 차단되는 것을 확인했습니다.
