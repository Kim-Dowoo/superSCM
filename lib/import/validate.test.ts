import test from 'node:test';
import assert from 'node:assert/strict';
import { inferMapping } from './schema.ts';
import { validateRows } from './validate.ts';

test('필수 컬럼과 한국어 컬럼 매핑을 검증한다', () => {
  const mapping = inferMapping(['품목코드', '출고일', '출고수량'], ['item_id', 'use_date', 'qty']);
  const issues = validateRows('usage_history', [{ 품목코드: 'ITEM001', 출고일: '2026-01-01', 출고수량: '2' }], mapping);
  assert.equal(issues.length, 0);
});

test('잘못된 날짜·필수값·중복을 오류와 경고로 보존한다', () => {
  const mapping = { item_id: 'item_id', use_date: 'use_date', qty: 'qty' };
  const issues = validateRows('usage_history', [
    { item_id: 'ITEM001', use_date: '2026/01/01', qty: '' },
    { item_id: 'ITEM001', use_date: '2026/01/01', qty: '' },
  ], mapping);
  assert.ok(issues.some((issue) => issue.errorCode === 'INVALID_DATE' && issue.severity === 'ERROR'));
  assert.ok(issues.some((issue) => issue.errorCode === 'REQUIRED_VALUE_MISSING'));
  assert.ok(issues.some((issue) => issue.errorCode === 'DUPLICATE_ROW' && issue.severity === 'WARNING'));
});
