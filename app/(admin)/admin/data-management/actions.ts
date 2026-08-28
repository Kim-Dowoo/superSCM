'use server';
import { requireAdmin } from '@/lib/auth';
import { inferMapping } from '@/lib/import/schema';
import { parseImportFile } from '@/lib/import/parse';
import { validateRows } from '@/lib/import/validate';
import { createBatch, importBatch, remapBatch, rollbackBatch } from '@/lib/import/repository';
import { IMPORT_TYPES, type ImportMode, type ImportType } from '@/lib/import/types';

export async function validateImport(formData: FormData) {
  await requireAdmin();
  const file = formData.get('file'); const type = formData.get('importType'); const mode = formData.get('importMode');
  if (!(file instanceof File) || !IMPORT_TYPES.includes(type as ImportType)) throw new Error('파일과 데이터 종류를 확인해주세요.');
  if (mode !== 'append' && mode !== 'upsert' && mode !== 'replace') throw new Error('Import mode가 올바르지 않습니다.');
  const parsed = await parseImportFile(file); const mapping = inferMapping(parsed.columns, (await import('@/lib/import/schema')).REQUIRED_COLUMNS[type as ImportType]);
  const issues = validateRows(type as ImportType, parsed.rows, mapping);
  const supabase = await (await import('@/lib/supabase')).createSupabaseServerClient();
  if (mapping.item_id) {
    const { data } = await supabase.schema('core').from('v_item_master').select('item_id');
    const known = new Set((data ?? []).map((row) => String(row.item_id)));
    parsed.rows.forEach((row, index) => { const value = row[mapping.item_id]; if (value && known.size && !known.has(String(value))) issues.push({ rowNumber: index + 2, fieldName: 'item_id', errorCode: 'ITEM_NOT_FOUND', errorMessage: '품목 마스터에 없는 품목코드입니다.', severity: 'ERROR', originalValue: value }); });
  }
  if (mapping.supplier_id) {
    const { data } = await supabase.schema('core').from('v_supplier_master').select('supplier_id');
    const known = new Set((data ?? []).map((row) => String(row.supplier_id)));
    parsed.rows.forEach((row, index) => { const value = row[mapping.supplier_id]; if (value && known.size && !known.has(String(value))) issues.push({ rowNumber: index + 2, fieldName: 'supplier_id', errorCode: 'SUPPLIER_NOT_FOUND', errorMessage: '공급처 마스터에 없는 공급처 코드입니다.', severity: 'ERROR', originalValue: value }); });
  }
  const mapped = parsed.rows.map((row) => Object.fromEntries(Object.entries(mapping).filter(([, source]) => source).map(([target, source]) => [target, row[source]])));
  const batchId = await createBatch(file.name, type as ImportType, mode as ImportMode, parsed.rows, mapped, issues, mapping);
  return { batchId, totalRows: parsed.rows.length, columns: parsed.columns, mapping, issues };
}

export async function confirmImport(formData: FormData): Promise<void> { await requireAdmin(); const batchId = formData.get('batchId'); if (typeof batchId !== 'string') throw new Error('batch_id가 필요합니다.'); await importBatch(batchId); }
export async function rollbackImport(formData: FormData): Promise<void> { await requireAdmin(); const batchId = formData.get('batchId'); if (typeof batchId !== 'string') throw new Error('batch_id가 필요합니다.'); await rollbackBatch(batchId); }
export async function remapImport(formData: FormData) { await requireAdmin(); const batchId = formData.get('batchId'); const mappingValue = formData.get('mapping'); if (typeof batchId !== 'string' || typeof mappingValue !== 'string') throw new Error('매핑 정보가 필요합니다.'); return remapBatch(batchId, JSON.parse(mappingValue) as Record<string, string>); }
