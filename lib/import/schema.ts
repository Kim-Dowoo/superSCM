import type { ImportType } from './types.ts';

export const REQUIRED_COLUMNS: Record<ImportType, string[]> = {
  usage_history: ['item_id', 'use_date', 'qty'], inventory: ['item_id', 'quantity'], item_master: ['item_id'], supplier_master: ['supplier_id'], purchase_order: ['item_id', 'order_date'], goods_receipt: ['item_id', 'receipt_date'], sales_order: ['item_id', 'order_date', 'quantity'], business_event: ['event_type', 'event_date'],
};

const aliases: Record<string, string[]> = { item_id: ['item_id', 'item', '품목코드', '품목ID'], use_date: ['use_date', 'usage_date', '출고일', '사용일'], qty: ['qty', 'quantity', '출고수량', '수량'], supplier_id: ['supplier_id', 'supplier', '공급처코드'], order_date: ['order_date', '발주일'], receipt_date: ['receipt_date', '입고일'], event_type: ['event_type', '이벤트유형'], event_date: ['event_date', '이벤트일'] };

export function inferMapping(columns: string[], required: string[]): Record<string, string> {
  return Object.fromEntries(required.map((target) => {
    const source = columns.find((column) => aliases[target]?.some((alias) => alias.toLowerCase() === column.trim().toLowerCase()));
    return [target, source ?? ''];
  }));
}
