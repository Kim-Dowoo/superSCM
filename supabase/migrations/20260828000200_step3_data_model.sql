-- STEP 3: raw 입력 확장과 Forecast 학습/검증 기간 격리

create schema if not exists raw;
create schema if not exists core;
create schema if not exists analytics;

-- 신규 raw 입력 테이블. 원본 컬럼은 업로드 계약의 최소 공통 필드로 유지합니다.
create table if not exists raw.business_event (
  business_event_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  event_date date not null,
  item_id text,
  description text,
  batch_id text,
  source_type text default 'unknown',
  loaded_at timestamptz default now(),
  source_record_id text
);

create table if not exists raw.sales_order (
  sales_order_id uuid primary key default gen_random_uuid(),
  order_date date not null,
  item_id text not null,
  quantity numeric,
  customer_id text,
  status text,
  batch_id text,
  source_type text default 'unknown',
  loaded_at timestamptz default now(),
  source_record_id text
);

create table if not exists raw.item_substitute (
  item_substitute_id uuid primary key default gen_random_uuid(),
  item_id text not null,
  substitute_item_id text not null,
  priority integer,
  valid_from date,
  valid_to date,
  batch_id text,
  source_type text default 'unknown',
  loaded_at timestamptz default now(),
  source_record_id text
);

-- 기존 raw 입력 테이블에는 nullable 추적 컬럼을 추가해 기존 적재 행을 보존합니다.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'shipment_log', 'usage_history', 'supplier_master', 'item_master',
    'purchase_order', 'goods_receipt', 'inventory', 'business_event',
    'sales_order', 'item_substitute'
  ] loop
    if to_regclass('raw.' || table_name) is not null then
      execute format('alter table raw.%I add column if not exists batch_id text', table_name);
      execute format('alter table raw.%I add column if not exists source_type text', table_name);
      execute format('alter table raw.%I add column if not exists loaded_at timestamptz default now()', table_name);
      execute format('alter table raw.%I add column if not exists source_record_id text', table_name);
    end if;
  end loop;
end;
$$;

create index if not exists raw_business_event_date_idx on raw.business_event (event_date);
create index if not exists raw_sales_order_date_idx on raw.sales_order (order_date);
create index if not exists raw_item_substitute_item_idx on raw.item_substitute (item_id);

-- 운영 정책은 코드가 아니라 core에서 관리합니다.
create table if not exists core.policy_config (
  policy_key text primary key,
  service_level numeric,
  review_period_days integer,
  safety_buffer_days integer,
  value_text text,
  description text,
  updated_at timestamptz not null default now(),
  check (service_level is null or service_level between 0 and 1),
  check (review_period_days is null or review_period_days >= 0),
  check (safety_buffer_days is null or safety_buffer_days >= 0)
);

create table if not exists core.outlier_rule (
  rule_id uuid primary key default gen_random_uuid(),
  rule_code text not null unique,
  rule_type text not null check (rule_type in ('PROJECT', 'RETURN', 'DUPLICATE', 'OTHER')),
  description text,
  condition_json jsonb not null default '{}'::jsonb,
  exclude_from_training boolean not null default true,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists core.item_policy (
  item_id text primary key,
  moq numeric,
  pack_size numeric,
  item_grade text,
  service_level numeric,
  updated_at timestamptz not null default now(),
  check (moq is null or moq >= 0),
  check (pack_size is null or pack_size > 0),
  check (service_level is null or service_level between 0 and 1)
);

create table if not exists core.forecast_setting (
  setting_id text primary key default 'default',
  train_start date,
  train_end date,
  test_start date,
  test_end date,
  granularity text not null default 'day' check (granularity in ('day', 'week', 'month')),
  updated_at timestamptz not null default now(),
  check (train_start is null or train_end is null or train_start <= train_end),
  check (test_start is null or test_end is null or test_start <= test_end),
  check (train_end is null or test_start is null or train_end < test_start)
);

insert into core.forecast_setting (setting_id)
values ('default')
on conflict (setting_id) do nothing;

-- 학습/검증은 usage_history의 실제 날짜만 기간 설정과 비교합니다.
create or replace view core.v_train_demand as
select u.*
  from raw.usage_history u
  cross join core.forecast_setting f
 where f.setting_id = 'default'
   and f.train_start is not null
   and f.train_end is not null
   and u.use_date >= f.train_start
   and u.use_date <= f.train_end;

create or replace view core.v_test_actual as
select u.*
  from raw.usage_history u
  cross join core.forecast_setting f
 where f.setting_id = 'default'
   and f.test_start is not null
   and f.test_end is not null
   and u.use_date >= f.test_start
   and u.use_date <= f.test_end;

create or replace view analytics.v_data_coverage as
with bounds as (
  select min(use_date) as data_start, max(use_date) as data_end
    from raw.usage_history
), setting as (
  select * from core.forecast_setting where setting_id = 'default'
)
select bounds.data_start,
       bounds.data_end,
       setting.train_start,
       setting.train_end,
       setting.test_start,
       setting.test_end,
       (select count(*) from core.v_train_demand) as train_row_count,
       (select count(*) from core.v_test_actual) as test_row_count,
       (bounds.data_start is not null and setting.train_start is not null
        and setting.train_end is not null and setting.train_start >= bounds.data_start
        and setting.train_end <= bounds.data_end) as train_window_ok,
       (bounds.data_start is not null and setting.test_start is not null
        and setting.test_end is not null and setting.test_start >= bounds.data_start
        and setting.test_end <= bounds.data_end) as test_window_ok
  from bounds cross join setting;

create or replace view analytics.v_forecast_settings as
select f.setting_id,
       f.train_start,
       f.train_end,
       f.test_start,
       f.test_end,
       f.granularity,
       c.data_start,
       c.data_end,
       c.train_row_count,
       c.test_row_count,
       c.train_window_ok,
       c.test_window_ok,
       (select count(*) from core.policy_config) as policy_count,
       (select count(*) from core.outlier_rule where active = true) as active_outlier_rule_count,
       (select count(*) from core.item_policy) as item_policy_count
  from core.forecast_setting f
  cross join analytics.v_data_coverage c
 where f.setting_id = 'default';

-- STEP2 권한 원칙을 유지합니다. raw는 직접 노출하지 않고, core/analytics 뷰만 조회합니다.
revoke all on schema raw from public, anon, authenticated;
revoke all on all tables in schema raw from public, anon, authenticated;
alter default privileges in schema raw revoke all on tables from public, anon, authenticated;

grant usage on schema core, analytics to authenticated;
grant select on core.v_train_demand, core.v_test_actual to authenticated;
grant select on analytics.v_data_coverage, analytics.v_forecast_settings to authenticated;
grant select on core.policy_config, core.outlier_rule, core.item_policy, core.forecast_setting to authenticated;

alter table core.policy_config enable row level security;
alter table core.outlier_rule enable row level security;
alter table core.item_policy enable row level security;
alter table core.forecast_setting enable row level security;

drop policy if exists policy_config_authenticated_select on core.policy_config;
create policy policy_config_authenticated_select on core.policy_config for select to authenticated using (true);
drop policy if exists policy_config_admin_write on core.policy_config;
create policy policy_config_admin_write on core.policy_config for all to authenticated using (core.is_admin()) with check (core.is_admin());

drop policy if exists outlier_rule_authenticated_select on core.outlier_rule;
create policy outlier_rule_authenticated_select on core.outlier_rule for select to authenticated using (true);
drop policy if exists outlier_rule_admin_write on core.outlier_rule;
create policy outlier_rule_admin_write on core.outlier_rule for all to authenticated using (core.is_admin()) with check (core.is_admin());

drop policy if exists item_policy_authenticated_select on core.item_policy;
create policy item_policy_authenticated_select on core.item_policy for select to authenticated using (true);
drop policy if exists item_policy_admin_write on core.item_policy;
create policy item_policy_admin_write on core.item_policy for all to authenticated using (core.is_admin()) with check (core.is_admin());

drop policy if exists forecast_setting_authenticated_select on core.forecast_setting;
create policy forecast_setting_authenticated_select on core.forecast_setting for select to authenticated using (true);
drop policy if exists forecast_setting_admin_write on core.forecast_setting;
create policy forecast_setting_admin_write on core.forecast_setting for all to authenticated using (core.is_admin()) with check (core.is_admin());
