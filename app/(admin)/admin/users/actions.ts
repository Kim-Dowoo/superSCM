'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { canUpdateAppUser, type AppRole } from '@/lib/authz';
import { createSupabaseServerClient } from '@/lib/supabase';

export type UserManagementState = {
  error: string | null;
  message: string | null;
};

function isAppRole(value: FormDataEntryValue | null): value is AppRole {
  return value === 'ADMIN' || value === 'USER';
}

export async function updateUser(
  _: UserManagementState,
  formData: FormData
): Promise<UserManagementState> {
  const admin = await requireAdmin();
  const targetUserId = formData.get('userId');
  const role = formData.get('role');
  const active = formData.has('active');

  if (typeof targetUserId !== 'string' || !targetUserId || !isAppRole(role)) {
    return { error: '변경할 사용자 정보가 올바르지 않습니다.', message: null };
  }

  if (!canUpdateAppUser({
    actorId: admin.id,
    actorRole: 'ADMIN',
    targetUserId,
    nextRole: role,
    nextActive: active,
  })) {
    return { error: '본인의 관리자 역할 또는 활성 상태는 변경할 수 없습니다.', message: null };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('admin_update_user', {
    target_user_id: targetUserId,
    next_role: role,
    next_active: active,
  });

  if (error) {
    return { error: '사용자 권한 변경에 실패했습니다.', message: null };
  }

  revalidatePath('/admin/users');
  return { error: null, message: '사용자 권한을 변경했습니다.' };
}
