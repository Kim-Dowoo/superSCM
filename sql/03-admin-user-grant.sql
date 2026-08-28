-- 관리자 전용 사용자 권한 변경 쿼리
--
-- 이 쿼리는 로그인한 ADMIN 세션에서 실행해야 합니다.
-- 앱의 관리자 사용자 관리 화면 또는 Supabase 클라이언트에서
-- core.admin_update_user RPC를 호출하는 방식과 동일합니다.
-- SQL Editor에서 최초 ADMIN을 만드는 경우에는 아래 2번 RPC를 건너뛰고
-- 파일 하단의 부트스트랩 DO 블록만 먼저 실행하세요.

-- 1) 대상 사용자의 auth.users.id 확인
select user_id, email, name, department, role, active
  from core.app_user
 where email = 'user@example.com';

-- 2) 대상 사용자를 ADMIN으로 승격하고 활성화
-- target_user_id는 위 조회 결과의 user_id로 교체합니다.
-- 아래 RPC는 앱에 로그인한 ADMIN 세션에서만 실행됩니다.
select core.admin_update_user(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'ADMIN',
  true
);

-- USER로 변경하려면 다음처럼 실행합니다.
-- select core.admin_update_user(
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'USER',
--   true
-- );

-- 변경 및 감사 로그 확인
select user_id, email, role, active, updated_at
  from core.app_user
 where user_id = '00000000-0000-0000-0000-000000000000'::uuid;

select actor, action, target_type, target_id, before, after, at
  from core.audit_log
 where target_type = 'app_user'
   and target_id = '00000000-0000-0000-0000-000000000000'::uuid
 order by at desc
 limit 1;

-- 최초 ADMIN이 아직 없는 경우에는 SQL Editor의 auth.uid()가 NULL이므로
-- 위 RPC가 실패합니다. 아래 부트스트랩을 1회 실행한 뒤, 이후 변경은 반드시 RPC를 사용하세요.
-- 이메일을 실제 최초 관리자 이메일로 바꿉니다.
do $$
declare
  target_user core.app_user%rowtype;
  previous_user core.app_user%rowtype;
  updated_user core.app_user%rowtype;
begin
  if exists (select 1 from core.app_user where role = 'ADMIN' and active = true) then
    raise exception '활성 ADMIN이 이미 존재합니다. core.admin_update_user RPC를 사용하세요.';
  end if;

  select * into target_user
    from core.app_user
   where email = 'admin@example.com';
  if not found then
    raise exception '해당 이메일의 app_user를 찾을 수 없습니다.';
  end if;

  previous_user := target_user;
  update core.app_user
     set role = 'ADMIN', active = true
   where user_id = target_user.user_id
   returning * into updated_user;

  -- SQL Editor에는 actor 세션이 없으므로 부트스트랩 대상 계정을 actor로 기록합니다.
  insert into core.audit_log (actor, action, target_type, target_id, before, after)
  values (
    updated_user.user_id,
    'BOOTSTRAP_ADMIN',
    'app_user',
    updated_user.user_id,
    to_jsonb(previous_user),
    to_jsonb(updated_user)
  );
end;
$$;
