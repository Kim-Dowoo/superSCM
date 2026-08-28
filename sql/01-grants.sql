-- STEP 2 권한 원칙: anon은 업무 데이터를 조회하거나 변경할 수 없습니다.
-- 이 파일은 20260828000100_auth_rbac.sql 마이그레이션과 동일한 GRANT 정책을
-- SQL Editor에서 점검·재적용할 때 사용합니다.

revoke all on schema core, analytics from public, anon;
revoke all privileges on all tables in schema core from public, anon;
revoke all privileges on all tables in schema analytics from public, anon;
revoke all privileges on all sequences in schema core from public, anon;
revoke all privileges on all functions in schema core from public, anon;
revoke all privileges on all functions in schema analytics from public, anon, authenticated;
alter default privileges in schema core revoke all on tables from public, anon;
alter default privileges in schema analytics revoke all on tables from public, anon;
alter default privileges in schema core revoke execute on functions from public, anon;
alter default privileges in schema analytics revoke execute on functions from public, anon, authenticated;

-- authenticated는 활성 프로필 검사가 붙은 분석 화면 뷰만 조회합니다.
-- 뷰 래퍼와 secure_v_* 함수는 마이그레이션에서 생성합니다.
grant usage on schema core, analytics to authenticated;
revoke all privileges on all tables in schema core from authenticated;
revoke all privileges on all tables in schema analytics from authenticated;
grant select on analytics.v_leadtime_gap,
                analytics.v_stockout_risk,
                analytics.v_stockout_kpi,
                analytics.v_usage_profile,
                analytics.v_usage_anomaly to authenticated;
grant execute on function analytics.secure_v_leadtime_gap() to authenticated;
grant execute on function analytics.secure_v_stockout_risk() to authenticated;
grant execute on function analytics.secure_v_stockout_kpi() to authenticated;
grant execute on function analytics.secure_v_usage_profile() to authenticated;
grant execute on function analytics.secure_v_usage_anomaly() to authenticated;

-- core의 예외는 프로필 조회, 관리자 감사 조회 및 관리자 전용 확정값 변경입니다.
-- 실제 행 접근 및 변경 권한은 02-policies.sql의 RLS가 활성 ADMIN으로 제한합니다.
grant select on core.app_user, core.audit_log to authenticated;
grant select, insert, update, delete on core.leadtime_plan, core.usage_profile to authenticated;

revoke all on function core.is_admin() from public, anon;
grant execute on function core.is_admin() to authenticated;
revoke all on function core.admin_update_user(uuid, text, boolean) from public, anon;
grant execute on function core.admin_update_user(uuid, text, boolean) to authenticated;

-- 확인: anon은 false, authenticated의 analytics 권한은 true여야 합니다.
select has_schema_privilege('anon', 'analytics', 'usage') as anon_analytics_schema_ok,
       has_table_privilege('anon', 'analytics.v_leadtime_gap', 'select') as anon_analytics_view_ok,
       has_table_privilege('authenticated', 'analytics.v_leadtime_gap', 'select') as authenticated_analytics_view_ok;
