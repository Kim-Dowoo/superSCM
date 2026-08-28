-- STEP 6: SQL Baseline Forecast와 실행 이력

alter table core.forecast_setting add column if not exists forecast_horizon integer not null default 3 check (forecast_horizon > 0);

create table if not exists core.model_config (
  model_id text primary key,
  model_name text not null,
  family text not null,
  engine text not null default 'SQL',
  version text not null,
  enabled boolean not null default true,
  is_default boolean not null default false,
  applicable_demand_type text[] not null default array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'],
  parameters jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists core.model_version (
  model_version_id uuid primary key default gen_random_uuid(),
  model_id text not null references core.model_config(model_id),
  version text not null,
  parameters jsonb not null,
  definition jsonb not null,
  captured_at timestamptz not null default now(),
  captured_by uuid references auth.users(id),
  unique (model_id, model_version_id)
);

create table if not exists core.forecast_run (
  run_id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('RUNNING','SUCCESS','FAILED')),
  granularity text not null,
  train_start date,
  train_end date,
  horizon integer not null,
  champion_metric text,
  data_snapshot_at timestamptz,
  models jsonb not null default '[]'::jsonb,
  n_models integer not null default 0,
  n_items integer not null default 0,
  n_rows integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms bigint,
  triggered_by uuid references auth.users(id),
  triggered_email text,
  note text,
  message text
);

create table if not exists core.forecast_result (
  run_id uuid not null references core.forecast_run(run_id) on delete cascade,
  model_id text not null references core.model_config(model_id),
  model_version text not null,
  item_id text not null,
  period date not null,
  predicted_qty numeric,
  p50 numeric,
  p80 numeric,
  p90 numeric,
  sigma numeric,
  basis text not null,
  primary key (run_id, model_id, item_id, period)
);

insert into core.model_config (model_id, model_name, family, engine, version, is_default, applicable_demand_type, parameters, description)
values
 ('MA_3M','3개월 이동평균','MOVING_AVERAGE','SQL','1.0',true,array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'],'{"window":3}'::jsonb,'최근 3개월 평균'),
 ('MA_6M','6개월 이동평균','MOVING_AVERAGE','SQL','1.0',false,array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'],'{"window":6}'::jsonb,'최근 6개월 평균'),
 ('WMA_3M','3개월 가중 이동평균','WEIGHTED_MOVING_AVERAGE','SQL','1.0',false,array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'],'{"weights":[3,2,1]}'::jsonb,'최근순 3:2:1'),
 ('PY_SAME_MONTH','전년 동월','SEASONAL_NAIVE','SQL','1.0',false,array['SMOOTH','ERRATIC'],'{"lag_months":12}'::jsonb,'12개월 전 동일 월'),
 ('SEASONAL_NAIVE','계절 순진 예측','SEASONAL_NAIVE','SQL','1.0',false,array['SMOOTH','ERRATIC'],'{"lag_months":12}'::jsonb,'12개월 전 동일 월'),
 ('CROSTON_BASELINE','Croston 준비 모델','INTERMITTENT','SQL','1.0',false,array['INTERMITTENT','LUMPY'],'{}'::jsonb,'STEP6에서는 비활성 상태')
on conflict (model_id) do nothing;

create or replace view core.v_train_monthly_demand as
with setting as (select train_start, train_end from core.forecast_setting where setting_id = 'default'),
months as (select generate_series(date_trunc('month', train_start), date_trunc('month', train_end), interval '1 month')::date as period from setting where train_start is not null and train_end is not null),
items as (select distinct item_id from core.v_train_demand where item_id is not null),
grid as (select i.item_id, m.period from items i cross join months m)
select g.item_id, g.period, coalesce(sum(d.qty), 0)::numeric as quantity
  from grid g left join core.v_train_demand d on d.item_id = g.item_id and date_trunc('month', d.use_date)::date = g.period
 group by g.item_id, g.period;

create or replace function core.run_baseline_forecast()
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); setting_row core.forecast_setting%rowtype; run_id_value uuid; model_row core.model_config%rowtype; snapshot_at timestamptz := now(); model_ids jsonb := '[]'::jsonb; model_count integer := 0; item_count integer := 0; result_count integer := 0; inserted_rows integer := 0; started timestamptz := clock_timestamp();
begin
  if not core.is_admin() then raise exception '관리자만 Forecast를 실행할 수 있습니다.' using errcode = '42501'; end if;
  select * into setting_row from core.forecast_setting where setting_id = 'default';
  if setting_row.train_start is null or setting_row.train_end is null then raise exception 'Forecast 학습 기간이 설정되지 않았습니다.'; end if;
  insert into core.forecast_run(status, granularity, train_start, train_end, horizon, data_snapshot_at, triggered_by, triggered_email) values ('RUNNING', setting_row.granularity, setting_row.train_start, setting_row.train_end, setting_row.forecast_horizon, snapshot_at, actor, (select email from auth.users where id = actor)) returning run_id into run_id_value;
  for model_row in select * from core.model_config where enabled = true and engine = 'SQL' order by model_id loop
    insert into core.model_version(model_id, version, parameters, definition, captured_by) values (model_row.model_id, model_row.version, model_row.parameters, to_jsonb(model_row), actor);
    model_ids := model_ids || jsonb_build_array(model_row.model_id); model_count := model_count + 1;
    insert into core.forecast_result(run_id, model_id, model_version, item_id, period, predicted_qty, p50, p80, p90, sigma, basis)
    with periods as (select (date_trunc('month', setting_row.train_end) + (n || ' month')::interval)::date as period from generate_series(1, setting_row.forecast_horizon) n), items as (select distinct item_id from core.v_train_monthly_demand), forecasts as (
      select i.item_id, p.period,
        case model_row.model_id
          when 'MA_3M' then (select avg(quantity) from (select quantity from core.v_train_monthly_demand d where d.item_id=i.item_id and d.period <= date_trunc('month',setting_row.train_end)::date order by d.period desc limit 3) x)
          when 'MA_6M' then (select avg(quantity) from (select quantity from core.v_train_monthly_demand d where d.item_id=i.item_id and d.period <= date_trunc('month',setting_row.train_end)::date order by d.period desc limit 6) x)
          when 'WMA_3M' then (select sum(quantity * weight) / 6 from (select quantity, row_number() over (order by period desc) as rn from core.v_train_monthly_demand d where d.item_id=i.item_id and d.period <= date_trunc('month',setting_row.train_end)::date order by d.period desc limit 3) x cross join lateral (select case rn when 1 then 3 when 2 then 2 else 1 end::numeric as weight) w)
          when 'PY_SAME_MONTH' then (select quantity from core.v_train_monthly_demand d where d.item_id=i.item_id and d.period = (p.period - interval '12 months')::date)
          when 'SEASONAL_NAIVE' then (select quantity from core.v_train_monthly_demand d where d.item_id=i.item_id and d.period = (p.period - interval '12 months')::date)
          else null end as predicted_qty
      from items i cross join periods p)
    select run_id_value, model_row.model_id, model_row.version, f.item_id, f.period, f.predicted_qty, f.predicted_qty, null, null, null, model_row.model_id
      from forecasts f
      left join analytics.v_sku_demand_profile dp on dp.item_id = f.item_id
     where f.predicted_qty is not null
       and (dp.demand_type is null or dp.demand_type = any(model_row.applicable_demand_type));
    get diagnostics inserted_rows = row_count;
    result_count := result_count + inserted_rows;
  end loop;
  select count(distinct item_id) into item_count from core.forecast_result where run_id = run_id_value;
  update core.forecast_run set status='SUCCESS', finished_at=clock_timestamp(), duration_ms=(extract(epoch from (clock_timestamp()-started))*1000)::bigint, models=model_ids, n_models=model_count, n_items=item_count, n_rows=result_count where run_id=run_id_value;
  return run_id_value;
exception when others then
  if run_id_value is not null then update core.forecast_run set status='FAILED', finished_at=clock_timestamp(), message=sqlerrm, duration_ms=(extract(epoch from (clock_timestamp()-started))*1000)::bigint where run_id=run_id_value; end if;
  raise;
end; $$;

create or replace view analytics.v_model_config as select * from core.model_config;
create or replace view analytics.v_forecast_run as
select r.*, (coalesce((select max(b.imported_at) from core.upload_batch b where b.status='IMPORTED'), '-infinity'::timestamptz) > coalesce(r.data_snapshot_at, '-infinity'::timestamptz)) as is_stale from core.forecast_run r;
create or replace view analytics.v_forecast_result as select * from core.forecast_result;
create or replace view analytics.v_forecast_run_kpi as select run_id, count(*)::integer as result_rows, count(distinct model_id)::integer as model_count, count(distinct item_id)::integer as item_count from core.forecast_result group by run_id;

grant select on analytics.v_model_config, analytics.v_forecast_run, analytics.v_forecast_result, analytics.v_forecast_run_kpi to authenticated;
grant usage on schema core, analytics to authenticated;
grant select on core.v_train_monthly_demand to authenticated;
alter table core.model_config enable row level security; alter table core.model_version enable row level security; alter table core.forecast_run enable row level security; alter table core.forecast_result enable row level security;
drop policy if exists model_config_select on core.model_config; create policy model_config_select on core.model_config for select to authenticated using (true);
drop policy if exists model_config_admin_write on core.model_config; create policy model_config_admin_write on core.model_config for all to authenticated using (core.is_admin()) with check (core.is_admin());
drop policy if exists forecast_run_admin on core.forecast_run; create policy forecast_run_admin on core.forecast_run for all to authenticated using (core.is_admin()) with check (core.is_admin());
drop policy if exists forecast_result_admin on core.forecast_result; create policy forecast_result_admin on core.forecast_result for all to authenticated using (core.is_admin()) with check (core.is_admin());
drop policy if exists model_version_admin on core.model_version; create policy model_version_admin on core.model_version for all to authenticated using (core.is_admin()) with check (core.is_admin());
revoke all on function core.run_baseline_forecast() from public, anon; grant execute on function core.run_baseline_forecast() to authenticated;
