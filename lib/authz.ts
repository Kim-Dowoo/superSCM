export type AppRole = 'ADMIN' | 'USER';

export type AppUserUpdateRequest = {
  actorId: string | null;
  actorRole: AppRole | null;
  targetUserId: string;
  nextRole: AppRole;
  nextActive: boolean;
};

export function canAccessAdmin(role: AppRole | null): boolean {
  return role === 'ADMIN';
}

export function canUpdateAppUser({
  actorId,
  actorRole,
  targetUserId,
  nextRole,
  nextActive,
}: AppUserUpdateRequest): boolean {
  if (!actorId || !canAccessAdmin(actorRole)) return false;
  if (actorId !== targetUserId) return true;

  return nextRole === 'ADMIN' && nextActive;
}
