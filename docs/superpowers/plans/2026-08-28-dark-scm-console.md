# 다크 SCM 운영 콘솔 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 월간 발주계획과 분석 화면의 기능을 바꾸지 않고, `design.md`의 다크 SCM 운영 콘솔 디자인 시스템으로 일관되게 전환한다.

**Architecture:** 모든 시각 규칙은 `app/globals.css`의 의미 기반 CSS 변수와 기존 공통 클래스에 집중한다. 페이지와 워크플로 컴포넌트의 구조·데이터 조회·계산은 보존하며, 필요한 마크업 변경은 접근성 또는 공통 상태 표현에 한정한다. 루트 업무 흐름과 `/analysis/*`는 같은 토큰을 사용하되, 각자 현재의 내비게이션 구조는 유지한다.

**Tech Stack:** Next.js 15, React 19, TypeScript, 순수 CSS, lucide-react

**Spec:** `design.md`

## Global Constraints

- 새 CSS 프레임워크, CSS Modules, styled-components, 차트 라이브러리를 추가하지 않는다.
- 스타일은 `app/globals.css`에만 추가·변경한다.
- 데이터 화면은 `analytics` 조회와 `lib/scm.ts`의 기존 분리를 유지하며, 화면 컴포넌트에 계산식을 넣지 않는다.
- UI 문구와 주석은 한국어로 작성한다. 변수·컬럼명은 영어를 유지한다.
- 오류와 빈 결과를 구분하고, 계산 불가 값은 `—`와 사유로 표시한다.
- 일반 본문은 4.5:1 이상의 대비를 유지하고, 색상·텍스트·아이콘 중 두 가지 이상으로 상태를 전달한다.
- 각 완료 단위 뒤 `npm run test`와 `npm run build`를 실행한다.

---

### Task 1: 다크 토큰과 앱 골격 전환

**Files:**
- Modify: `app/globals.css:1-230`
- Test: `npm run build`

**Interfaces:**
- Consumes: `design.md` 1~5절과 기존 `app-shell`, `sidebar`, `topbar`, `content` 클래스
- Produces: 기존 화면이 사용할 `--canvas`, `--surface`, `--surface-high`, `--surface-highest`, `--ink`, `--muted`, `--line`, `--blue`, `--green`, `--amber`, `--red` CSS 변수

- [ ] **Step 1: 현재 공통 클래스 사용처를 확인한다**

Run: `rg -n 'className="[^"]*(app-shell|sidebar|topbar|content|card|button|tag)' app components`

Expected: 루트 업무 흐름과 분석 화면에서 공통 클래스가 쓰이고, 교체 범위가 `app/globals.css` 중심임을 확인한다.

- [ ] **Step 2: 다크 토큰을 구현한다**

`app/globals.css`의 `:root` 기존 라이트 값과 `html`, `body`를 아래 의미 기반 값으로 바꾼다.

```css
:root {
  --canvas: #031427;
  --surface: #0b1c30;
  --surface-high: #1b2b3f;
  --surface-highest: #26364a;
  --ink: #d3e4fe;
  --muted: #c6c6cd;
  --line: #45464d;
  --blue: #4cd7f6;
  --green: #4edea3;
  --amber: #f2bd6b;
  --red: #ffb4ab;
}
```

- [ ] **Step 3: 레이아웃 표면과 탐색 상태를 구현한다**

`app-shell`, `sidebar`, `topbar`, `content`, `brand`, `.nav-button`, `.nav-button.active`, `.local-badge`를 다크 표면 단계와 시안 선택 상태로 변경한다. 데스크톱 사이드바 폭은 240px, 상단바 높이는 64px로 통일하고 현재 메뉴에는 왼쪽 시안 막대를 준다.

- [ ] **Step 4: 포커스와 모션 감소 규칙을 구현한다**

파일 끝에 키보드 포커스와 모션 감소 규칙을 추가한다.

```css
:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
```

- [ ] **Step 5: 검사 명령을 실행한다**

Run: `npm run test; npm run build`

Expected: 두 명령 모두 exit code 0.

### Task 2: 공통 데이터 컴포넌트 전환

**Files:**
- Modify: `app/globals.css:카드·버튼·표·입력·상태 클래스`
- Modify: `components/analysis/reason-badge.tsx`
- Modify: `components/analysis/risk-badge.tsx`
- Test: `npm run test`

**Interfaces:**
- Consumes: Task 1 토큰, `ReasonBadge({ reason })`, `RiskBadge({ status })`
- Produces: `card`, `metric`, `button`, `tag`, `table-wrap`, `analysis-table`, 입력 공통 클래스의 다크 표현과 모든 분석 상태의 텍스트+색상 배지

- [ ] **Step 1: 상태 배지의 현재 출력 값을 확인하는 테스트를 실행한다**

Run: `npm run test`

Expected: 기존 `lib/scm-model.test.ts`가 PASS하고, UI 스타일 변경이 모델 정규화 계약을 바꾸지 않음을 확인한다.

- [ ] **Step 2: 카드·KPI·버튼·입력 스타일을 구현한다**

`card`는 `--surface`, `--line`, 8px 모서리, 16~24px 여백으로 바꾼다. `button primary`는 시안 배경과 어두운 글자, 기본 버튼은 높은 표면과 밝은 글자, `button ghost`는 약한 시안 배경을 사용한다. 입력·선택 요소는 `--surface-high` 배경을 사용하고 포커스 시 시안 링을 표시한다.

- [ ] **Step 3: 표와 상태 배지 스타일을 구현한다**

`table-wrap`, `analysis-table-wrap`, `th`, `td`, `.analysis-table th`, `.analysis-table td`를 다크 표면과 44px 내외 행 높이로 바꾼다. `tag blue|green|amber|red|gray`, `text-good`, `text-danger`, `positive`에 문서의 의미 색상을 적용한다. 수치 정렬 클래스는 유지한다.

- [ ] **Step 4: 배지 컴포넌트가 상태명을 계속 출력하는지 확인하고 필요 시 보완한다**

`RiskBadge`는 `SAFE`, `CRITICAL`, `UNKNOWN`을 한국어 상태 텍스트로, `ReasonBadge`는 사유 텍스트로 출력해야 한다. 상태가 `null`일 때는 `—`를 출력한다. 색상만으로 상태를 전달하는 변경은 하지 않는다.

- [ ] **Step 5: 검사 명령을 실행한다**

Run: `npm run test; npm run build`

Expected: 두 명령 모두 exit code 0.

### Task 3: 업무 흐름과 분석 헤더의 시각적 일관성 정리

**Files:**
- Modify: `components/procurement-app.tsx`
- Modify: `components/analysis/analysis-frame.tsx`
- Modify: `components/analysis/analysis-tabs.tsx`
- Modify: `app/analysis/layout.tsx`
- Modify: `app/globals.css:진행 단계·분석 탭 클래스`
- Test: `npm run build`

**Interfaces:**
- Consumes: Task 1~2의 토큰, `ProcurementApp`, `AnalysisFrame`, `AnalysisTabs`
- Produces: 업무 흐름과 분석 화면 모두에서 시안 선택 상태·다크 탐색 표면·한국어 안내를 쓰는 공통 경험

- [ ] **Step 1: 현재 내비게이션의 접근성 구조를 확인한다**

Run: `rg -n 'aria-label|aria-current|<nav|<button' components/procurement-app.tsx components/analysis`

Expected: 업무 단계와 분석 탭의 현재 위치를 식별할 수 있는 기존 구조를 확인한다.

- [ ] **Step 2: 업무 흐름 탐색을 전환한다**

`procurement-app.tsx`에서 활성 업무 단계 버튼에 `aria-current="step"`을 추가한다. 화면 구조와 단계 전환 로직은 바꾸지 않는다. CSS에서 완료 단계는 초록, 현재 단계는 시안, 나머지는 보조 글자로 표시한다.

- [ ] **Step 3: 분석 헤더와 탭을 전환한다**

`analysis-topbar`, `analysis-home`, `analysis-tabs`, `analysis-tab`을 사이드바와 동일한 다크 표면·시안 선택 규칙으로 변경한다. 탭의 `aria-current="page"`는 유지하고, 라이브 배지는 초록 정보로 표시한다.

- [ ] **Step 4: 좁은 화면 규칙을 점검·보완한다**

760px 이하에서 탐색·제목·버튼·KPI가 겹치지 않도록 기존 미디어 쿼리를 다크 토큰과 함께 보완한다. 표는 가로 스크롤을 유지하며 핵심 열을 숨기지 않는다.

- [ ] **Step 5: 검사 명령을 실행한다**

Run: `npm run test; npm run build`

Expected: 두 명령 모두 exit code 0.

### Task 4: 브라우저 시각 검증과 문서 동기화

**Files:**
- Modify: `design.md` (검증 중 발견한 실제 규격 불일치가 있을 때만)
- Test: `npm run build`, 브라우저 수동 검증

**Interfaces:**
- Consumes: Task 1~3 구현 결과
- Produces: 루트 업무 흐름과 두 분석 화면의 시각·접근성 검증 결과

- [ ] **Step 1: 개발 서버를 실행한다**

Run: `npm run dev`

Expected: 로컬 서버가 기동되어 `/`, `/analysis/leadtime`, `/analysis/stockout`를 제공한다.

- [ ] **Step 2: 데스크톱 화면을 검증한다**

각 페이지에서 다음을 확인한다: 다크 캔버스, 사이드바/상단바 표면 단계, 시안 활성 상태, 카드·표의 텍스트 대비, 정상·주의·위험 배지의 텍스트 병기, 키보드 포커스 표시.

- [ ] **Step 3: 760px 이하 화면을 검증한다**

모바일 폭에서 탐색, 제목, KPI, 버튼이 잘리지 않고 표가 가로 스크롤되는지 확인한다.

- [ ] **Step 4: 최종 빌드를 실행한다**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 5: 문서와 구현을 비교한다**

`design.md`의 토큰, 공통 클래스, 상태 의미와 실제 구현을 대조한다. 구현에서 의도적으로 달라진 값이 있으면 그 이유와 최종 값을 `design.md`에 반영한다.
