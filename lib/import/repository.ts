import { createSupabaseServerClient } from '@/lib/supabase';
import type { ImportRow, ImportType, ImportMode, ValidationIssue } from './types.ts';
import { validateRows } from './validate.ts';

export async function createBatch(fileName: string, importType: ImportType, importMode: ImportMode, rows: ImportRow[], mappedRows: ImportRow[], issues: ValidationIssue[], mapping: Record<string, string> = {}) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('로그인이 필요합니다.');
  const batch = await supabase.schema('core').from('upload_batch').insert({ file_name: fileName, import_type: importType, import_mode: importMode, total_rows: rows.length, success_rows: rows.length - new Set(issues.filter((i) => i.severity === 'ERROR').map((i) => i.rowNumber)).size, warning_rows: new Set(issues.filter((i) => i.severity === 'WARNING').map((i) => i.rowNumber)).size, error_rows: new Set(issues.filter((i) => i.severity === 'ERROR').map((i) => i.rowNumber)).size, status: 'VALIDATED', uploaded_by: auth.user.id }).select('batch_id').single();
  if (batch.error || !batch.data) throw new Error(batch.error?.message ?? 'batch 생성에 실패했습니다.');
  const batchId = batch.data.batch_id as string;
  const staging = mappedRows.map((mapped_data, index) => ({ batch_id: batchId, row_number: index + 2, original_data: rows[index], mapped_data, validation_status: issues.some((i) => i.rowNumber === index + 2 && i.severity === 'ERROR') ? 'ERROR' : issues.some((i) => i.rowNumber === index + 2) ? 'WARNING' : 'SUCCESS' }));
  if (staging.length) await supabase.schema('core').from('import_staging').insert(staging);
  if (issues.length) await supabase.schema('core').from('validation_error').insert(issues.map((issue) => ({ batch_id: batchId, ...issue, original_value: issue.originalValue == null ? null : String(issue.originalValue) })));
  const mappingRows = Object.entries(mapping).filter(([, source_column]) => source_column).map(([target_column, source_column]) => ({ import_type: importType, source_column, target_column, confirmed_by: auth.user.id }));
  if (mappingRows.length) await supabase.schema('core').from('column_mapping').upsert(mappingRows, { onConflict: 'import_type,source_column' });
  return batchId;
}

export async function importBatch(batchId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('import_validated_batch', { target_batch_id: batchId });
  if (error) throw new Error(error.message);
}

export async function rollbackBatch(batchId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('rollback_batch', { target_batch_id: batchId });
  if (error) throw new Error(error.message);
}

export async function remapBatch(batchId: string, mapping: Record<string, string>) {
  const supabase = await createSupabaseServerClient();
  const { data: batch, error: batchError } = await supabase.schema('core').from('upload_batch').select('import_type').eq('batch_id', batchId).single();
  if (batchError || !batch) throw new Error(batchError?.message ?? 'batch를 찾을 수 없습니다.');
  const { data: staging, error: stagingError } = await supabase.schema('core').from('import_staging').select('row_number,original_data').eq('batch_id', batchId).order('row_number');
  if (stagingError) throw new Error(stagingError.message);
  const rows = (staging ?? []).map((row) => row.original_data as ImportRow);
  const issues = validateRows(batch.import_type as ImportType, rows, mapping);
  await supabase.schema('core').from('validation_error').delete().eq('batch_id', batchId);
  for (let index = 0; index < rows.length; index += 1) {
    const mapped_data = Object.fromEntries(Object.entries(mapping).filter(([, source]) => source).map(([target, source]) => [target, rows[index][source]]));
    const rowIssues = issues.filter((issue) => issue.rowNumber === index + 2);
    await supabase.schema('core').from('import_staging').update({ mapped_data, validation_status: rowIssues.some((issue) => issue.severity === 'ERROR') ? 'ERROR' : rowIssues.length ? 'WARNING' : 'SUCCESS' }).eq('batch_id', batchId).eq('row_number', index + 2);
  }
  if (issues.length) await supabase.schema('core').from('validation_error').insert(issues.map((issue) => ({ batch_id: batchId, ...issue, original_value: issue.originalValue == null ? null : String(issue.originalValue) })));
  const errorRows = new Set(issues.filter((issue) => issue.severity === 'ERROR').map((issue) => issue.rowNumber)).size;
  const warningRows = new Set(issues.filter((issue) => issue.severity === 'WARNING').map((issue) => issue.rowNumber)).size;
  await supabase.schema('core').from('upload_batch').update({ error_rows: errorRows, warning_rows: warningRows, success_rows: rows.length - errorRows, status: 'VALIDATED' }).eq('batch_id', batchId);
  return { batchId, totalRows: rows.length, columns: Object.values(mapping), mapping, issues };
}
