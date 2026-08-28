import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessAdmin, canUpdateAppUser } from './authz.ts';

test('미인증 사용자는 관리자 화면에 접근할 수 없다', () => {
  assert.equal(canAccessAdmin(null), false);
});

test('USER는 관리자 화면에 접근할 수 없다', () => {
  assert.equal(canAccessAdmin('USER'), false);
});

test('ADMIN은 관리자 화면에 접근할 수 있다', () => {
  assert.equal(canAccessAdmin('ADMIN'), true);
});

test('관리자는 자신의 관리자 역할을 낮출 수 없다', () => {
  assert.equal(
    canUpdateAppUser({
      actorId: 'admin-1',
      actorRole: 'ADMIN',
      targetUserId: 'admin-1',
      nextRole: 'USER',
      nextActive: true,
    }),
    false
  );
});

test('관리자는 자신을 비활성화할 수 없다', () => {
  assert.equal(
    canUpdateAppUser({
      actorId: 'admin-1',
      actorRole: 'ADMIN',
      targetUserId: 'admin-1',
      nextRole: 'ADMIN',
      nextActive: false,
    }),
    false
  );
});

test('관리자는 다른 사용자의 역할과 활성 상태를 변경할 수 있다', () => {
  assert.equal(
    canUpdateAppUser({
      actorId: 'admin-1',
      actorRole: 'ADMIN',
      targetUserId: 'user-1',
      nextRole: 'USER',
      nextActive: false,
    }),
    true
  );
});
