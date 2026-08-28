'use server';

import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function updateLeadtime(formData: FormData) {
  await requireAdmin();
  const supplierId = String(formData.get('supplier_id') ?? '');
  const rawValue = String(formData.get('lead_time') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  const leadTime = rawValue === '' ? null : Number(rawValue);
  if (!supplierId || (leadTime !== null && !Number.isInteger(leadTime)) || !reason) throw new Error('공급처, 정수 Lead Time, 변경 사유를 확인해 주세요.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('admin_set_leadtime', { target_supplier_id: supplierId, next_lead_time: leadTime, reason_text: reason });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/scm-policies/leadtime');
}
