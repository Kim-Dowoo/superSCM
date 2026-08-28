import { REQUIRED_COLUMNS } from './schema.ts';
import type { ImportRow, ImportType, ValidationIssue } from './types.ts';

const dateFields = new Set(['use_date', 'order_date', 'receipt_date', 'event_date']);
const numericFields = new Set(['qty', 'quantity', 'moq', 'pack_size']);
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function validateRows(type: ImportType, rows: ImportRow[], mapping: Record<string, string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const required = REQUIRED_COLUMNS[type];
  const missing = required.filter((field) => !mapping[field]);
  missing.forEach((field) => issues.push({ rowNumber: 0, fieldName: field, errorCode: 'REQUIRED_COLUMN_MISSING', errorMessage: `필수 컬럼 매핑이 없습니다: ${field}`, severity: 'ERROR', originalValue: null }));
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const mapped = Object.fromEntries(Object.entries(mapping).filter(([, source]) => source).map(([target, source]) => [target, row[source]]));
    const duplicateKey = JSON.stringify(required.map((field) => mapped[field] ?? null));
    if (seen.has(duplicateKey)) issues.push({ rowNumber, fieldName: null, errorCode: 'DUPLICATE_ROW', errorMessage: '중복 행입니다.', severity: 'WARNING', originalValue: duplicateKey });
    seen.add(duplicateKey);
    required.forEach((field) => { if (mapped[field] === null || mapped[field] === undefined || mapped[field] === '') issues.push({ rowNumber, fieldName: field, errorCode: 'REQUIRED_VALUE_MISSING', errorMessage: `필수값이 없습니다: ${field}`, severity: 'ERROR', originalValue: mapped[field] }); });
    Object.entries(mapped).forEach(([field, value]) => {
      if (value === null || value === undefined || value === '') return;
      if (dateFields.has(field) && !isoDate.test(String(value))) issues.push({ rowNumber, fieldName: field, errorCode: 'INVALID_DATE', errorMessage: '날짜는 YYYY-MM-DD 형식이어야 합니다.', severity: 'ERROR', originalValue: value });
      if (numericFields.has(field) && !Number.isFinite(Number(value))) issues.push({ rowNumber, fieldName: field, errorCode: 'INVALID_NUMBER', errorMessage: '숫자 형식이 아닙니다.', severity: 'ERROR', originalValue: value });
      if (numericFields.has(field) && Number(value) < 0) issues.push({ rowNumber, fieldName: field, errorCode: 'NEGATIVE_VALUE', errorMessage: '음수 값은 허용되지 않습니다.', severity: 'ERROR', originalValue: value });
    });
    if (mapped.order_date && mapped.receipt_date && String(mapped.receipt_date) < String(mapped.order_date)) issues.push({ rowNumber, fieldName: 'receipt_date', errorCode: 'DATE_ORDER_INVALID', errorMessage: '입고일은 발주일보다 빠를 수 없습니다.', severity: 'ERROR', originalValue: mapped.receipt_date });
  });
  return issues;
}
