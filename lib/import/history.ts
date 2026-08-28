import { createSupabaseServerClient } from '@/lib/supabase';
export async function getImportHistory() { const supabase = await createSupabaseServerClient(); return supabase.schema('core').from('upload_batch').select('*').order('uploaded_at', { ascending: false }); }
