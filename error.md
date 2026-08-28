# 오류 기록

## 2026-08-28 — 사용자 활성 상태가 항상 비활성으로 저장됨

- 증상: 사용자 관리에서 비활성 계정을 활성으로 선택해도 변경 Action이 `false`를 받았습니다.
- 원인: 폼의 hidden `active=false`가 체크박스 `active=true`보다 먼저 전송됐고, `FormData.get('active')`는 첫 번째 값만 반환했습니다.
- 해결: hidden 입력을 제거하고, 서버 Action에서 체크박스 존재 여부인 `FormData.has('active')`로 활성 상태를 판별합니다.
- 검증: 동일 이름 값 `false`, `true`를 순서대로 넣은 FormData에서 `get('active')`가 `false`임을 재현한 뒤 수정했습니다. 수정 후에는 체크됨일 때만 `active` 필드가 전송됩니다.
