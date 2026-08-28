export const IMPORT_TYPES = ['usage_history', 'inventory', 'item_master', 'supplier_master', 'purchase_order', 'goods_receipt', 'sales_order', 'business_event'] as const;
export type ImportType = typeof IMPORT_TYPES[number];
export type ImportMode = 'append' | 'upsert' | 'replace';
export type ImportRow = Record<string, unknown>;
export type ValidationSeverity = 'WARNING' | 'ERROR';
export type ValidationIssue = { rowNumber: number; fieldName: string | null; errorCode: string; errorMessage: string; severity: ValidationSeverity; originalValue: unknown };
