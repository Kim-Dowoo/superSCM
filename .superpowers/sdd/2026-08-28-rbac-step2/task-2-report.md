# Task 2 구현 보고서 — SSR 세션과 서버 권한 helper

## 구현 범위

- `lib/supabase/server.ts`를 `@supabase/ssr`의 `createServerClient`와 Next `cookies()` 기반으로 변경했습니다. 서버 컴포넌트에서 쿠키 갱신이 허용되지 않는 경우는 middleware가 갱신하도록 처리했습니다.
- `lib/supabase/client.ts`를 `createBrowserClient`로 변경했습니다. 브라우저와 서버 모두 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 사용하며, secret/service role 키를 읽거나 전달하지 않습니다.
- 환경 helper가 `sb_secret_` 키를 public publishable-key 변수로 사용하는 구성을 즉시 거부하도록 보강했습니다.
- `lib/auth.ts`에 `getRole()`, `requireUser()`, `requireAdmin()`을 추가했습니다. 모두 Auth 사용자를 확인한 뒤 `core.app_user`의 `role`, `active`를 재확인하며, 프로필이 없거나 비활성화된 사용자는 권한을 얻지 못합니다.
- `lib/authz.ts`에 순수 권한 함수를 추가했습니다. ADMIN 여부와 관리자 자신의 역할 하향·자기 비활성화 금지 규칙을 DB RPC와 동일하게 판단합니다.
- `middleware.ts`에서 `/login`, Next 내부 자산, `/api/health/supabase`를 제외한 경로를 보호했습니다. 미로그인·비활성 사용자는 `/login?next=<pathname+search>`로 이동하고, USER의 `/admin` 및 `/admin/*` 요청은 서버 403으로 거부합니다.

## 테스트

- TDD: `lib/authz.test.ts`를 먼저 추가해 `lib/authz.ts` 부재로 실패하는 것을 확인한 뒤 구현했습니다.
- `npm test`: 11개 테스트 통과. 새 테스트는 미인증, USER, ADMIN, 자신의 ADMIN 역할 하향 방지, 자기 비활성화 방지, 다른 사용자 변경 허용을 검증합니다.
- `npx tsc --noEmit`: 통과.
- `npm run build`: 컴파일, 타입 검사, 8개 정적 페이지 생성, 빌드 trace 수집 완료. `.next/BUILD_ID` 생성을 확인했습니다.

## 확인 사항

- 초기 빌드 실패 원인은 코드가 아니라 워크트리에 `@supabase/ssr`가 설치되지 않은 상태였습니다. 잠금 파일 기준 의존성을 설치한 뒤 모듈 해석 문제를 해소했습니다.
- `npm test`는 기존 `package.json`의 모듈 타입 설정 때문에 `MODULE_TYPELESS_PACKAGE_JSON` 경고를 출력합니다. 이번 Task 2 범위와 무관하므로 설정 변경은 하지 않았습니다.
- `npm run build`는 상위 저장소와 워크트리의 두 lockfile 때문에 Next workspace-root 경고를 출력합니다. 빌드는 완료됐으며, 이 경고를 없애기 위한 Next 설정 변경은 범위 밖이라 수행하지 않았습니다.
