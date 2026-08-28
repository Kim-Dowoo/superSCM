# STEP 2 인증·RBAC 설계

## 목표

Supabase Auth 사용자와 `core.app_user` 프로필을 연결하고, DB RLS·서버 인증·라우트 보호가 같은 권한 기준을 강제한다.

## 권한 모델

- 신규 Auth 사용자는 트리거로 `core.app_user`에 `USER`와 `active = true`로 생성한다.
- 첫 관리자는 SQL Editor에서 신규 사용자의 이메일을 지정해 `ADMIN`으로 수동 승격한다.
- `core.is_admin()`은 `auth.uid()`와 `core.app_user`를 기준으로 판단하는 `security definer` 함수다.
- `anon`은 `core`, `analytics` 업무 데이터 접근과 모든 쓰기가 거부된다.
- 인증된 활성 사용자는 분석 뷰를 조회할 수 있다. `leadtime_plan`, `usage_profile`, 사용자 관리 변경은 활성 관리자만 허용한다.

## 변경 경로

관리자 화면 → Server Action → `requireAdmin()` → 관리자 전용 RPC → `core.app_user` 변경 + `core.audit_log` 기록 순서로 동작한다. RPC는 자신의 role 하향과 active 비활성화를 거부한다.

## 웹 계층

`@supabase/ssr` 서버 클라이언트가 쿠키 세션을 읽고, middleware가 미로그인 요청을 `/login?next=…`로 돌려보낸다. `/admin/*`의 USER 접근은 서버 레이아웃과 middleware에서 403으로 거부한다. 메뉴 필터링은 UX만 담당한다.

## 비밀값

브라우저에는 publishable key만 사용한다. service role client는 이번 단계에서 만들지 않으며, 향후 필요해도 서버 전용 별도 파일과 `SUPABASE_SERVICE_ROLE_KEY`로만 관리한다.

## 검증

SQL은 RLS·트리거·RPC·권한 철회를 한 migration에 둔다. 단위 테스트는 auth helper와 관리자 보호를 검증하며, `npm run build`에서 보호 라우트와 Server Action 타입을 확인한다.
