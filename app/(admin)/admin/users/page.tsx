import UserManagementTable, { type ManagedUser } from '@/components/admin/user-management-table';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import { requireAdmin } from '@/lib/auth';
import type { AppRole } from '@/lib/authz';
import { createSupabaseServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function UserManagementPage() {
  const currentUser = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema('core')
    .from('app_user')
    .select('user_id, email, name, department, role, active')
    .order('email', { ascending: true });

  if (error) {
    return <div className="page-content"><p>조회에 실패했습니다: {error.message}</p></div>;
  }

  const users: ManagedUser[] = (data ?? []).map((user) => ({
    userId: user.user_id,
    email: user.email,
    name: user.name,
    department: user.department,
    role: user.role as AppRole,
    active: user.active,
  }));

  return (
    <div className="page-content">
      <PageHeader title="사용자 관리" description="사용자 역할과 활성 상태를 관리합니다." />
      <Panel meta={`${users.length}명`} title="사용자 목록">
        <UserManagementTable currentUserId={currentUser.id} users={users} />
      </Panel>
    </div>
  );
}
