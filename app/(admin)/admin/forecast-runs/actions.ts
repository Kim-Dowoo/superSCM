'use server';
import { requireAdmin } from '@/lib/auth'; import { createSupabaseServerClient } from '@/lib/supabase'; import { revalidatePath } from 'next/cache';
export async function runBaseline() { await requireAdmin(); const supabase = await createSupabaseServerClient(); const { error } = await supabase.schema('core').rpc('run_baseline_forecast'); if (error) throw new Error(error.message); revalidatePath('/admin/forecast-runs'); }
