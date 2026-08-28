-- STEP 2 RLS 정책: 수업용 using (true) 정책을 제거하고 활성 ADMIN만 core 변경을 허용합니다.

alter table core.app_user enable row level security;
alter table core.audit_log enable row level security;
alter table core.leadtime_plan enable row level security;
alter table core.usage_profile enable row level security;

drop policy if exists "수업용 전체 허용" on core.leadtime_plan;
drop policy if exists "수업용 전체 허용" on core.usage_profile;

drop policy if exists app_user_self_or_admin_select on core.app_user;
create policy app_user_self_or_admin_select
  on core.app_user
  for select
  to authenticated
  using ((auth.uid() = user_id and active = true) or core.is_admin());

drop policy if exists app_user_admin_update on core.app_user;
create policy app_user_admin_update
  on core.app_user
  for update
  to authenticated
  using (core.is_admin())
  with check (core.is_admin());

drop policy if exists audit_log_admin_select on core.audit_log;
create policy audit_log_admin_select
  on core.audit_log
  for select
  to authenticated
  using (core.is_admin());

drop policy if exists leadtime_plan_admin_all on core.leadtime_plan;
create policy leadtime_plan_admin_all
  on core.leadtime_plan
  for all
  to authenticated
  using (core.is_admin())
  with check (core.is_admin());

drop policy if exists usage_profile_admin_all on core.usage_profile;
create policy usage_profile_admin_all
  on core.usage_profile
  for all
  to authenticated
  using (core.is_admin())
  with check (core.is_admin());

-- 확인: 수업용 전체 허용 정책은 0건이며, 아래 정책만 조회되어야 합니다.
select schemaname, tablename, policyname, roles, cmd
  from pg_policies
 where schemaname = 'core'
   and tablename in ('app_user', 'audit_log', 'leadtime_plan', 'usage_profile')
 order by tablename, policyname;
