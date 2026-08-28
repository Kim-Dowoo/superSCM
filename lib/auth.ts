import type { User } from '@supabase/supabase-js';
import { type AppRole, canAccessAdmin } from './authz';
import { createSupabaseServerClient } from './supabase/server';

type ActiveUser = {
  user: User;
  role: AppRole;
};

function isAppRole(value: unknown): value is AppRole {
  return value === 'ADMIN' || value === 'USER';
}

async function getActiveUser(): Promise<ActiveUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .schema('core')
    .from('app_user')
    .select('role, active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error('사용자 권한을 확인하지 못했습니다.');
  }
  if (!profile?.active || !isAppRole(profile.role)) return null;

  return { user, role: profile.role };
}

export async function getRole(): Promise<AppRole | null> {
  return (await getActiveUser())?.role ?? null;
}

export async function requireUser(): Promise<User> {
  const activeUser = await getActiveUser();
  if (!activeUser) {
    throw new Error('로그인한 활성 사용자만 이용할 수 있습니다.');
  }
  return activeUser.user;
}

export async function requireAdmin(): Promise<User> {
  const activeUser = await getActiveUser();
  if (!activeUser) {
    throw new Error('로그인한 활성 사용자만 이용할 수 있습니다.');
  }
  if (!canAccessAdmin(activeUser.role)) {
    throw new Error('관리자 권한이 필요합니다.');
  }
  return activeUser.user;
}
