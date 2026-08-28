import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  await requireAdmin();
  const { batchId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema('core').from('validation_error').select('row_number,field_name,error_code,error_message,severity,original_value').eq('batch_id', batchId).in('severity', ['ERROR', 'WARNING']).order('row_number');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const header = 'row_number,field_name,error_code,error_message,severity,original_value';
  const csv = [header, ...(data ?? []).map((row) => [row.row_number, row.field_name ?? '', row.error_code, row.error_message, row.severity, row.original_value ?? ''].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\r\n');
  return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="validation-errors-${batchId}.csv"` } });
}
