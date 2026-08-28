import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('공통 상단바에 로그아웃 폼이 포함된다', () => {
  const source = readFileSync(new URL('./topbar.tsx', import.meta.url), 'utf8');
  assert.match(source, /LogoutButton/);
  assert.match(source, /<LogoutButton\s*\/>/);
});
