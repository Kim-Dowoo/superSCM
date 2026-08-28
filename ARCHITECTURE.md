# superSCM 아키텍처 문서

이 문서는 현재 저장소의 폴더와 파일이 어떤 책임을 갖고, 서로 어떤 경로로 연결되는지를 설명한다. 구현된 프로토타입을 기준으로 작성했으며, 향후 기능 확장 시 지켜야 할 경계도 함께 기록한다.

## 1. 한눈에 보는 구조

### 1.1 시스템 요약

superSCM은 한국후지필름BI의 월간 기기·옵션 발주계획을 다루는 Next.js 15 프로토타입이다. 메인 화면은 6단계 발주 업무 흐름을 브라우저 상태로 보여주고, 분석 화면은 서버 컴포넌트에서 Supabase의 `analytics` 스키마를 조회해 표시한다.

```text
브라우저
  └─ app/page.tsx
      └─ components/procurement-app.tsx
          ├─ components/workflow/*  (6단계 데모 UI)
          └─ app/analysis/*          (분석 화면 링크)

분석 요청
  └─ app/analysis/leadtime/page.tsx
      └─ lib/scm.ts                  (조회 경계)
          ├─ lib/supabase/server.ts  (서버 Supabase 클라이언트)
          ├─ lib/supabase/env.ts     (환경변수 검증)
          └─ analytics.v_leadtime_gap
              └─ lib/scm-model.ts    (행 정규화·표시 타입)

상태 확인
  └─ app/api/health/supabase/route.ts
      └─ lib/supabase/env.ts

데이터베이스 변경
  └─ supabase/migrations/* → public 테이블·트리거
  └─ sql/*                 → 권한·RLS 정책
```

### 1.2 폴더별 요약

| 폴더 | 기능 요약 | 주요 산출물 |
|---|---|---|
| `app/` | Next.js App Router의 라우트, 전역 레이아웃, API | 메인 화면, 분석 화면, Supabase health API |
| `app/analysis/` | 분석 전용 레이아웃과 분석 페이지 | 리드타임 격차 표 |
| `app/api/` | 서버 API 엔드포인트 | Supabase 환경변수 상태 확인 |
| `components/` | 화면 조립과 재사용 UI 컴포넌트 | 업무 플로우, 카드, 탭, 데이터 표 |
| `components/workflow/` | 월간 발주계획 6단계의 프레젠테이션 UI | 대시보드·수요·공급·마스터·계산·보고 단계 |
| `components/analysis/` | 분석 화면 공통 껍데기와 표 | 프레임, 탭, 제네릭 표 |
| `lib/` | 도메인 타입, 정규화, Supabase 조회·연결 | `LeadtimeGap`, 조회 함수, 클라이언트 |
| `supabase/` | Supabase CLI 설정과 스키마 마이그레이션 | 발주계획 관련 테이블과 트리거 |
| `sql/` | DB 권한과 RLS 정책 SQL | grants, policies |
| `docs/` | 실습·설계 보조 문서 | 실습 안내, 계획, 명세 |
| `outputs/` | 프로세스 정의서 및 시각 산출물 | XLSX, NDJSON, PNG 미리보기 |
| 루트 파일 | 실행·컴파일·배포·프로젝트 운영 설정 | `package.json`, `tsconfig.json`, `vercel.json` 등 |

## 2. 런타임 및 데이터 흐름

### 2.1 메인 업무 플로우

1. `app/page.tsx`가 `ProcurementApp`을 렌더링한다.
2. `ProcurementApp`은 `StepId`와 현재 단계 상태를 관리한다.
3. 단계별 컴포넌트에 `onNext`, `onBack`, `onOpenStep` 콜백을 전달한다.
4. 각 단계는 공통 `StepFrame`을 사용해 이전/다음 버튼과 화면 구조를 통일한다.
5. 현재 구현은 입력·저장·계산을 DB에 반영하지 않는 Phase 1 프리뷰다.

### 2.2 분석 데이터 흐름

1. 사용자가 `/analysis/leadtime`에 접근한다.
2. `LeadtimePage` 서버 컴포넌트가 `getLeadtimeGap()`을 호출한다.
3. `lib/scm.ts`가 서버 Supabase 클라이언트를 만들고 `analytics.v_leadtime_gap`을 조회한다.
4. 원본 행은 `normalizeLeadtimeGap()`에서 여러 가능한 컬럼명을 화면 타입으로 통일한다.
5. `AnalysisFrame`과 `DataTable`이 지표 카드와 표를 렌더링한다.
6. 조회 오류는 오류 문구로 구분해 표시하고, 데이터가 없으면 표의 빈 상태 문구를 표시한다.

### 2.3 데이터 계층 원칙

문서화된 목표 데이터 계층은 다음과 같다.

```text
raw       원본 CSV 적재 영역, 화면에서 직접 조회하지 않음
  ↓ 정제·매핑
core      공급처 별칭, 확정 리드타임·사용 프로파일, 정제 뷰
  ↓ 계산
analytics 화면과 AI가 읽는 뷰
```

현재 마이그레이션 파일에는 발주계획용 `public.*` 테이블이 정의되어 있고, 분석 코드는 별도로 `analytics` 뷰를 조회한다. 따라서 운영 DB를 연결할 때는 `SCHEMA.md`의 `raw/core/analytics` 구조와 마이그레이션의 `public` 구조가 어떤 배포 단계에서 사용되는지 명확히 정리해야 한다.

## 3. 폴더 및 파일 상세

### 3.1 `app/`

#### `app/layout.tsx`

모든 라우트의 루트 레이아웃이다. `globals.css`를 전역으로 로드하고 HTML 언어를 한국어로 지정한다. `metadata`에 브라우저 제목과 설명을 설정한다.

#### `app/page.tsx`

루트 경로(`/`)의 진입점이다. 화면 자체의 업무 로직을 갖지 않고 `ProcurementApp`을 반환해 라우트와 화면 조립을 분리한다.

#### `app/globals.css`

애플리케이션 전체 스타일시트다. 사이드바, 상단 바, 카드, 그리드, 업무 단계, 분석 표 등 모든 공통 시각 스타일을 순수 CSS로 정의한다. Tailwind나 CSS Module을 사용하지 않는 프로젝트의 디자인 토큰과 컴포넌트 스타일 경계다.

### 3.2 `app/analysis/`

분석 화면 전용 라우트 영역이다. 업무 플로우 화면과 분석 화면의 레이아웃을 분리해, 분석 메뉴와 표 중심 콘텐츠를 공통으로 유지한다.

#### `app/analysis/layout.tsx`

분석 하위 라우트의 레이아웃이다. `AnalysisTabs`를 배치하고 하위 페이지 콘텐츠를 감싼다. 새 분석 기능은 이 레이아웃 아래에 `app/analysis/<기능>/page.tsx`로 추가한다.

#### `app/analysis/leadtime/page.tsx`

공급처별 마스터 리드타임과 실적 P80의 격차를 보여주는 서버 컴포넌트다. `dynamic = 'force-dynamic'`으로 페이지 캐시를 막고, `getLeadtimeGap()` 결과에 따라 오류 상태 또는 지표 카드·데이터 표를 렌더링한다. 표시 계산(공급처 수, 양의 격차 수, 표본 부족 수)은 화면 요약용이며, 통계 원천 계산은 DB 뷰에서 제공해야 한다.

### 3.3 `app/api/`

서버 측 HTTP 엔드포인트 영역이다. 브라우저에서 직접 Supabase를 조회하지 않고, 상태 점검처럼 제한된 서버 기능을 라우트로 노출한다.

#### `app/api/health/supabase/route.ts`

GET 요청에 대해 Supabase 환경변수가 설정됐는지를 확인한다. 연결 자체나 데이터 조회보다 배포 환경의 설정 누락을 빠르게 식별하는 용도다. 비밀 키를 반환하지 않아야 한다.

### 3.4 `components/`

페이지가 사용하는 React UI 컴포넌트 모음이다. 라우트 파일은 데이터 조회와 페이지 조립에 집중하고, 화면 구조와 상호작용은 이 폴더에 둔다.

#### `components/procurement-app.tsx`

월간 발주계획 전체 화면의 상태 조정자다. `StepId` 유니온으로 6단계(`dashboard`, `demand`, `supply`, `master`, `calculation`, `report`)를 정의하고 현재 단계, 진행 단계, 이벤트 핸들러를 관리한다. 단계 컴포넌트를 선택해 렌더링하며 공통 아이콘 맵 `Icons`도 제공한다.

### 3.5 `components/workflow/`

월간 발주계획 업무 플로우의 단계별 화면이다. 현재는 로컬 상태와 샘플 문구 중심의 프로토타입이며, 실제 입력·계산·저장 기능을 붙일 때 DB 조회/변경 로직을 직접 넣지 않고 별도 도메인·조회 계층을 사용해야 한다.

| 파일 | 역할 |
|---|---|
| `dashboard-step.tsx` | 전체 현황, 금액·수요·예외·보고자료 요약 카드와 단계 진입 버튼 |
| `demand-step.tsx` | OL 수요, SFDC 파이프라인, 대형 딜 등 수요 확정 UI 샘플 |
| `supply-step.tsx` | 재고·입고예정·공급 상태를 보여주는 공급 단계 UI 샘플 |
| `master-step.tsx` | 품목·공급처 마스터 검증 단계 UI 샘플 |
| `calculation-step.tsx` | 발주량 계산 결과와 예외를 보여주는 계산 단계 UI 샘플 |
| `report-step.tsx` | 결과 보고자료와 다운로드 진입을 보여주는 보고 단계 UI 샘플 |
| `step-frame.tsx` | 단계 화면의 공통 프레임과 이전/다음 네비게이션 |

### 3.6 `components/analysis/`

분석 라우트에서 공통으로 쓰는 프레젠테이션 컴포넌트다.

| 파일 | 역할 |
|---|---|
| `analysis-frame.tsx` | 분석 제목, 설명, 본문 영역을 감싸는 공통 레이아웃 |
| `analysis-tabs.tsx` | 분석 하위 메뉴를 현재 경로와 연결하는 탭 네비게이션 |
| `data-table.tsx` | 제네릭 행 타입을 받는 표 컴포넌트, 정렬·정렬 방향·셀 렌더러·빈 상태 지원 |

`data-table.tsx`의 `formatNumber`는 화면 표시 포맷터다. 평균·분위수·위험 판정 같은 업무 계산을 이 컴포넌트에 넣지 않는다.

### 3.7 `lib/`

화면과 외부 데이터 사이의 도메인 경계다. 타입, 정규화, 조회, Supabase 클라이언트 생성을 이 폴더에서 담당한다.

#### `lib/scm-model.ts`

분석 화면에 필요한 도메인 타입과 정규화 함수를 정의한다. `LeadtimeGap`은 DB 컬럼명을 화면용 `supplier`, `masterLeadTime`, `actualAverage`, `p80`, `gap`으로 통일한다. `value`와 `numberValue`를 통해 컬럼명 변경이나 숫자 문자열을 흡수하며, 화면 컴포넌트가 원본 행 구조를 알지 않도록 한다.

#### `lib/scm-model.test.ts`

`normalizeLeadtimeGap`의 정규화 동작을 Node 테스트로 검증한다. 화면이 아닌 순수 함수만 대상으로 하므로 데이터 컬럼 매핑이 변경될 때 가장 먼저 보강해야 하는 테스트다.

#### `lib/scm.ts`

분석 조회 함수의 단일 진입점이다. `getLeadtimeGap`은 `analytics.v_leadtime_gap`을 조회하고 정규화된 행 배열과 오류 메시지를 반환한다. `getStockoutKpi`는 `analytics.v_stockout_kpi`에서 요약 한 건을 조회한다. 조회 실패와 빈 결과를 구분할 수 있도록 오류를 예외로 흘리지 않고 반환 형태에 담는다.

#### `lib/supabase.ts`

Supabase 브라우저·서버 클라이언트와 환경변수 도우미를 외부에 재-export하는 짧은 파사드다. 호출부가 하위 파일 경로에 의존하지 않도록 한다.

#### `lib/supabase/env.ts`

`NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 읽고 검증한다. 선택적 조회용 `getSupabaseEnv`와 필수 연결용 `requireSupabaseEnv`를 제공한다. `sb_secret_` 키를 클라이언트에서 사용하지 않는 보안 경계다.

#### `lib/supabase/client.ts`

브라우저 컴포넌트에서 사용할 Supabase 클라이언트를 만든다. 공개 publishable 키만 사용하며, 호출 전 공통 환경변수 검증기를 통과한다.

#### `lib/supabase/server.ts`

서버 컴포넌트·서버 함수에서 사용할 Supabase 클라이언트를 만든다. 세션을 저장하지 않는 읽기 중심 설정으로 구성되어 있으며 `lib/scm.ts`의 조회 함수가 사용한다.

### 3.8 `supabase/`

Supabase CLI가 관리하는 프로젝트 설정과 마이그레이션이다.

#### `supabase/config.toml`

로컬 Supabase 개발 환경의 CLI 설정 파일이다. 로컬 DB·API·스튜디오 등의 포트와 기능 설정을 관리한다.

#### `supabase/migrations/20260813000100_create_procurement_demand_core.sql`

월간 발주계획의 핵심 `public` 테이블을 생성한다. `planning_runs`를 중심으로 `ol_demand`, `sfdc_pipeline`, `bulk_deals`, `historical_actuals`, `demand_confirmations`가 연결된다. 날짜·수량·확률·상태에 CHECK 제약을 두고, 조회 성능을 위한 외래 키 인덱스를 만들며, `set_updated_at` 트리거로 수정 시각을 자동 갱신한다.

이 마이그레이션은 발주 입력/확정 모델의 기반이고, `SCHEMA.md`에 정의된 `raw`, `core`, `analytics` 분석 계층과는 목적이 다르다. 두 모델을 함께 운영할 경우 통합 뷰나 명확한 데이터 수명주기를 별도로 정의해야 한다.

### 3.9 `sql/`

마이그레이션과 분리해 운영 권한을 관리하는 SQL 영역이다.

| 파일 | 역할 |
|---|---|
| `sql/01-grants.sql` | 스키마·테이블·뷰에 대한 역할별 접근 권한 부여 |
| `sql/02-policies.sql` | Supabase RLS(Row Level Security) 정책 정의 |

권한 SQL은 애플리케이션 코드에서 실행하지 않고 DB 배포 절차에서 관리한다. `raw` 원본 직접 수정 금지와 `analytics` 읽기 중심 원칙을 정책에 반영해야 한다.

### 3.10 `docs/`

사람이 읽는 프로젝트 보조 문서다.

| 파일 | 역할 |
|---|---|
| `docs/04-실습안내.md` | 프로젝트 실습 순서와 검증 방법 안내 |
| `docs/superpowers/04-실습안내.md` | Superpowers 작업 흐름에 맞춘 실습 안내 사본 |
| `docs/superpowers/plans/2026-08-13-procurement-planning-mvp-plan.md` | MVP 구현 계획 |
| `docs/superpowers/plans/2026-08-13-supabase-cloud-readiness-plan.md` | Supabase 클라우드 연결 준비 계획 |
| `docs/superpowers/specs/2026-08-13-procurement-planning-mvp-prd.md` | 구현 범위를 정의한 PRD 명세 |

### 3.11 `outputs/`

프로세스 정의서에서 생성된 검토용 산출물이다. `019ff8b7-725b-7b41-99a2-f3b7bc66ee76/` 아래에 다음이 있다.

- `기기_옵션_월간발주_프로세스정의서.xlsx`: 원본 프로세스 정의서
- `*.xlsx.inspect.ndjson`: 스프레드시트 구조·검사 결과
- `preview_00_사용안내.png` ~ `preview_11_FXLIVE연계정의.png`: 시트별 시각 미리보기

애플리케이션 런타임이 직접 참조하는 코드는 아니며, 요구사항·업무 규칙·화면 설계의 참고 자료다. 용량이 큰 바이너리나 생성물은 배포 대상과 Git 추적 정책을 별도로 결정해야 한다.

### 3.12 루트 문서 및 데이터 파일

| 파일 | 역할 |
|---|---|
| `README.md` | 프로젝트 소개, 로컬 실행 방법, Phase 1 범위 |
| `README_배포전_확인.md` | 배포 전 점검 항목 |
| `AGENTS.md` | Codex 작업 규칙, 데이터 계층 원칙, 검증 규칙 |
| `SCHEMA.md` | Supabase `raw/core/analytics` 스키마 계약과 기대 행 수 |
| `2026-08-13-procurement-planning-mvp-prd.md` | 루트에 보관된 MVP PRD 사본 |
| `적용방법.md` | 프로젝트 적용·사용 방법 안내 |
| `docs/04-실습안내.md` 등 | 실습·설계 문서(상세는 `docs/` 절 참조) |
| `dump.sql` | DB 구조 또는 샘플 데이터를 재현하기 위한 SQL 덤프 |
| `~$차 강의안_수정.docx` | Office가 생성한 임시 잠금 파일. 애플리케이션 소스가 아니므로 커밋·배포에서 제외 권장 |

### 3.13 루트 실행·빌드 설정

| 파일 | 역할 |
|---|---|
| `package.json` | 프로젝트 메타데이터, `dev`·`build`·`start`·`test` 스크립트, Next/React/Supabase 의존성 |
| `package-lock.json` | npm 의존성의 재현 가능한 버전 잠금 |
| `next.config.ts` | Next.js 설정. 현재 React Strict Mode만 활성화 |
| `tsconfig.json` | strict TypeScript, bundler 모듈 해석, `@/*` 경로 별칭 설정 |
| `vercel.json` | Vercel이 프로젝트를 Next.js 프레임워크로 인식하도록 지정 |
| `.gitignore` | `node_modules`, `.next`, 로컬 환경 파일 등 생성·비밀 파일의 Git 제외 규칙 |
| `.env.example` | 일반 환경변수 작성 예시 |
| `.env.local.example` | Supabase 공개 URL·publishable 키를 로컬에 넣는 예시 |

## 4. 주요 인터페이스와 책임 경계

### 4.1 화면 ↔ 데이터 경계

- 페이지는 `lib/scm.ts`의 조회 함수만 호출한다.
- `lib/scm.ts`는 Supabase 스키마와 뷰 이름을 소유한다.
- `lib/scm-model.ts`는 DB 컬럼 변형을 화면 타입으로 정규화한다.
- 컴포넌트는 정규화된 타입을 받아 표시만 담당한다.
- 평균, 분위수, 위험 상태 같은 업무 계산은 SQL 뷰 또는 순수 모델 함수에 둔다.

### 4.2 오류와 빈 결과

조회 함수는 `{ rows/data, error }` 형태로 오류를 반환한다. 페이지는 `error`를 먼저 검사해 연결·권한·스키마 오류를 표시하고, 오류가 없을 때만 빈 배열을 “데이터 없음”으로 표시한다. 이를 통해 Supabase Exposed schemas 누락과 실제 데이터 부재를 구분한다.

### 4.3 보안 경계

- 브라우저에는 `NEXT_PUBLIC_*` 공개 값만 노출한다.
- `sb_secret_*` 키는 클라이언트 코드·번들·문서·Git에 넣지 않는다.
- 서버 Supabase 클라이언트는 `lib/supabase/server.ts`에서만 생성한다.
- DB 권한과 RLS는 `sql/`에서 관리하고 애플리케이션 화면과 분리한다.

## 5. 실행 및 배포 경로

```text
npm install
  ↓
npm run dev       → next dev (로컬 개발 서버)
npm run build     → next build (.next 생성)
npm run start     → next start (빌드 결과 실행)
npm test          → lib/**/*.test.ts Node 테스트
```

Vercel 배포에서는 `package.json`의 `build` 스크립트가 `next build`를 실행한다. `vercel.json`은 Next.js 프레임워크를 명시하며, 실제 배포 환경의 Supabase 공개 환경변수는 Vercel 프로젝트 설정에서 주입해야 한다. 로컬 `.env.local`은 저장소에 커밋하지 않는다.

## 6. 확장 시 지켜야 할 규칙

1. 새 분석 화면은 `lib/scm-model.ts` 타입·정규화 → `lib/scm.ts` 조회 → `app/analysis/<name>/page.tsx` 화면 → `components/analysis/*` 재사용 순서로 만든다.
2. `raw` 테이블을 화면에서 직접 조회하지 않고 `core` 또는 `analytics` 뷰를 사용한다.
3. 계산 불가 값은 `null`과 사유 코드로 표현하고 임의의 큰 숫자로 대체하지 않는다.
4. 업무 플로우 단계 컴포넌트에는 Supabase 조회나 통계 계산을 직접 넣지 않는다.
5. 새 스타일 프레임워크를 추가하지 않고 `app/globals.css`의 공통 클래스를 확장한다.
6. 변경 후 `npm run build`와 관련 테스트를 실행하고, 화면 행 수·대표 수식·극단값을 확인한다.
7. 문서·화면 문구와 주석은 한국어로 작성하고, 변수·타입명은 영어로 유지한다.

## 7. 현재 구현 상태 요약

- 메인 업무 플로우: 6단계 Phase 1 UI 프리뷰 구현
- 분석 화면: 리드타임 격차 화면 구현, Supabase `analytics.v_leadtime_gap` 조회
- 조회 함수: 리드타임 격차 및 재고 소진 KPI 함수 존재
- 데이터베이스: 발주계획 입력 모델을 위한 `public` 마이그레이션과 권한 SQL 존재
- 테스트: `normalizeLeadtimeGap` 순수 함수 테스트 존재
- 미완성 영역: 업무 단계의 실제 저장·계산, `analytics` 뷰 생성/동기화, 인증·권한별 화면 제어
