'use client';

import { useActionState } from 'react';
import { updateUser, type UserManagementState } from '@/app/(admin)/admin/users/actions';
import type { AppRole } from '@/lib/authz';

export type ManagedUser = {
  userId: string;
  email: string | null;
  name: string | null;
  department: string | null;
  role: AppRole;
  active: boolean;
};

const initialState: UserManagementState = { error: null, message: null };

function UserRow({ user, isCurrentAdmin }: { user: ManagedUser; isCurrentAdmin: boolean }) {
  const [state, formAction, isPending] = useActionState(updateUser, initialState);

  return (
    <tr>
      <td>{user.email ?? '—'}</td>
      <td>{user.name ?? '—'}</td>
      <td>{user.department ?? '—'}</td>
      <td>
        {isCurrentAdmin ? `${user.role} · ${user.active ? '활성' : '비활성'}` : (
          <form action={formAction}>
            <input name="userId" type="hidden" value={user.userId} />
            <select aria-label={`${user.email ?? user.name ?? '사용자'} 역할`} defaultValue={user.role} name="role">
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <input name="active" type="hidden" value="false" />
            <label>
              <input defaultChecked={user.active} name="active" type="checkbox" value="true" /> 활성
            </label>
            <button className="button" disabled={isPending} type="submit">
              {isPending ? '저장 중...' : '저장'}
            </button>
            {state.error ? <p className="text-critical" role="alert">{state.error}</p> : null}
            {state.message ? <p className="text-safe" role="status">{state.message}</p> : null}
          </form>
        )}
      </td>
      <td>{isCurrentAdmin ? '본인 계정은 변경할 수 없습니다.' : '변경 가능'}</td>
    </tr>
  );
}

export default function UserManagementTable({ users, currentUserId }: { users: ManagedUser[]; currentUserId: string }) {
  if (users.length === 0) {
    return <p>표시할 데이터가 없습니다.</p>;
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>이메일</th>
            <th>이름</th>
            <th>부서</th>
            <th>역할·활성 상태</th>
            <th>안내</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => <UserRow isCurrentAdmin={user.userId === currentUserId} key={user.userId} user={user} />)}
        </tbody>
      </table>
    </div>
  );
}
