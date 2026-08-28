import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('기본 경로가 진행현황 워크플로 화면을 사용한다', () => {
  const pagePath = new URL('./(legacy)/page.tsx', import.meta.url);
  assert.equal(existsSync(pagePath), true);
  assert.match(readFileSync(pagePath, 'utf8'), /ProcurementApp/);
});

test('분석 경로는 사용자 공통 셸 레이아웃을 사용한다', () => {
  const layoutPath = new URL('./(user)/analysis/layout.tsx', import.meta.url);
  assert.equal(existsSync(layoutPath), true);
  assert.match(readFileSync(layoutPath, 'utf8'), /Sidebar/);
});
