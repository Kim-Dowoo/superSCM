-- STEP 7: 검증 기간 Backtest와 Champion Model

alter table core.forecast_setting add column if not exists champion_metric text not null default 'WAPE' check (champion_metric in ('WAPE','MAPE','Bias','RMSE','MAE'));
alter table core.forecast_setting add column if not exists reference_model_id text default 'MA_3M';

create table if not exists core.backtest_run (
  backtest_run_id uuid primary key default gen_random_uuid(),
  forecast_run_id uuid not null references core.forecast_run(run_id),
  test_start date, test_end date, metric text not null, status text not null check (status in ('RUNNING','SUCCESS','FAILED')),
  started_at timestamptz not null default now(), finished_at timestamptz, triggered_by uuid references auth.users(id), message text
);
create table if not exists core.model_performance (
  backtest_run_id uuid not null references core.backtest_run(backtest_run_id) on delete cascade,
  run_id uuid not null references core.forecast_run(run_id), model_id text not null, model_version text not null, item_id text not null,
  n_periods integer not null default 0, wape numeric, mape numeric, bias numeric, rmse numeric, mae numeric, baseline_improvement numeric,
  rank integer, calculation_status text not null default 'SUCCESS', reason_code text, calculated_at timestamptz not null default now(),
  primary key (backtest_run_id, model_id, item_id)
);
create table if not exists core.champion_model (
  champion_id uuid primary key default gen_random_uuid(), item_id text not null, champion_model_id text not null, model_version text not null,
  champion_metric text not null, champion_metric_value numeric, wape numeric, mape numeric, bias numeric, rmse numeric, mae numeric,
  candidate_performance jsonb not null default '[]'::jsonb, selection_reason text not null, selection_method text not null check (selection_method in ('AUTO','MANUAL')),
  selected_at timestamptz not null default now(), selected_by uuid references auth.users(id)
);
create index if not exists champion_item_idx on core.champion_model(item_id, selected_at desc);

create or replace function core.run_backtest(target_run_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); setting_row core.forecast_setting%rowtype; forecast_row core.forecast_run%rowtype; bt_id uuid; started timestamptz := clock_timestamp();
begin
  if not core.is_admin() then raise exception '관리자만 Backtest를 실행할 수 있습니다.' using errcode = '42501'; end if;
  select * into setting_row from core.forecast_setting where setting_id='default';
  select * into forecast_row from core.forecast_run where run_id=target_run_id and status='SUCCESS';
  if not found then raise exception 'SUCCESS Forecast Run만 검증할 수 있습니다.'; end if;
  insert into core.backtest_run(forecast_run_id,test_start,test_end,metric,status,triggered_by) values(target_run_id,setting_row.test_start,setting_row.test_end,setting_row.champion_metric,'RUNNING',actor) returning backtest_run_id into bt_id;
  with actual as (select item_id, date_trunc('month',use_date)::date period, sum(qty)::numeric actual_qty from core.v_test_actual group by item_id,date_trunc('month',use_date)), joined as (select r.model_id,r.model_version,r.item_id,r.period,r.predicted_qty,a.actual_qty from core.forecast_result r left join actual a on a.item_id=r.item_id and a.period=r.period where r.run_id=target_run_id), grouped as (select model_id,max(model_version) model_version,item_id,count(*) filter(where actual_qty is not null and predicted_qty is not null)::integer n_periods,sum(abs(actual_qty)) actual_abs_sum,sum(abs(predicted_qty-actual_qty)) abs_error_sum,avg(abs(predicted_qty-actual_qty)) mae,sqrt(avg((predicted_qty-actual_qty)^2)) rmse,sum(predicted_qty-actual_qty)/nullif(sum(actual_qty),0) bias,avg(abs(predicted_qty-actual_qty)/nullif(abs(actual_qty),0)) filter(where actual_qty<>0) mape from joined group by model_id,item_id), scored as (select g.*,case when actual_abs_sum=0 then null else abs_error_sum/actual_abs_sum end wape,case when n_periods=0 then 'NO_COMPARABLE_PERIODS' when actual_abs_sum=0 then 'ACTUAL_SUM_ZERO' when mape is null then 'MAPE_DENOMINATOR_ZERO' else null end reason_code from grouped g), ranked as (select s.*,row_number() over(partition by item_id order by case setting_row.champion_metric when 'WAPE' then wape when 'MAPE' then mape when 'RMSE' then rmse when 'MAE' then mae when 'Bias' then abs(bias) end asc nulls last,abs(bias) asc nulls last,rmse asc nulls last,model_id) rank_value from scored s) insert into core.model_performance(backtest_run_id,run_id,model_id,model_version,item_id,n_periods,wape,mape,bias,rmse,mae,rank,calculation_status,reason_code) select bt_id,target_run_id,model_id,model_version,item_id,n_periods,wape,mape,bias,rmse,mae,rank_value,case when reason_code is null then 'SUCCESS' else 'CALCULATION_UNAVAILABLE' end,reason_code from ranked;
  insert into core.champion_model(item_id,champion_model_id,model_version,champion_metric,champion_metric_value,wape,mape,bias,rmse,mae,candidate_performance,selection_reason,selection_method,selected_by)
  select p.item_id,p.model_id,p.model_version,setting_row.champion_metric,case setting_row.champion_metric when 'WAPE' then p.wape when 'MAPE' then p.mape when 'RMSE' then p.rmse when 'MAE' then p.mae when 'Bias' then p.bias end,p.wape,p.mape,p.bias,p.rmse,p.mae,(select jsonb_agg(to_jsonb(x) order by x.rank) from core.model_performance x where x.backtest_run_id=bt_id and x.item_id=p.item_id),'AUTO: champion_metric 기준 최상위 모델', 'AUTO', actor from core.model_performance p where p.backtest_run_id=bt_id and p.rank=1 and p.calculation_status='SUCCESS';
  update core.backtest_run set status='SUCCESS',finished_at=clock_timestamp() where backtest_run_id=bt_id; return bt_id;
exception when others then if bt_id is not null then update core.backtest_run set status='FAILED',finished_at=clock_timestamp(),message=sqlerrm where backtest_run_id=bt_id; end if; raise;
end; $$;

create or replace function core.set_manual_champion(target_item_id text,target_model_id text,reason_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); p core.model_performance%rowtype; prior jsonb; metric_name text;
begin
  if not core.is_admin() then raise exception '관리자만 Champion을 변경할 수 있습니다.' using errcode='42501'; end if;
  if nullif(trim(reason_text),'') is null then raise exception '수동 Champion 변경 사유는 필수입니다.' using errcode='22023'; end if;
  select * into p from core.model_performance where item_id=target_item_id and model_id=target_model_id order by calculated_at desc limit 1;
  if not found then raise exception '해당 SKU의 성능 결과가 없습니다.'; end if;
  select candidate_performance into prior from core.champion_model where item_id=target_item_id order by selected_at desc limit 1;
  select champion_metric into metric_name from core.forecast_setting where setting_id='default';
  insert into core.champion_model(item_id,champion_model_id,model_version,champion_metric,champion_metric_value,wape,mape,bias,rmse,mae,candidate_performance,selection_reason,selection_method,selected_by) values(target_item_id,target_model_id,p.model_version,metric_name,case metric_name when 'WAPE' then p.wape when 'MAPE' then p.mape when 'RMSE' then p.rmse when 'MAE' then p.mae when 'Bias' then p.bias end,p.wape,p.mape,p.bias,p.rmse,p.mae,coalesce(prior,'[]'::jsonb),reason_text,'MANUAL',actor);
  insert into core.audit_log(actor,action,target_type,target_id,before,after) values(actor,'MANUAL_CHAMPION_UPDATE','champion_model',gen_random_uuid(),prior,jsonb_build_object('item_id',target_item_id,'model_id',target_model_id,'reason',reason_text));
end; $$;

create or replace view analytics.v_model_performance as select * from core.model_performance;
create or replace view analytics.v_champion_model as select * from core.champion_model;
create or replace view analytics.v_backtest_run as select * from core.backtest_run;
create or replace view analytics.v_model_comparison as
select r.run_id,r.model_id,r.model_version,r.item_id,r.period,r.predicted_qty,r.p50,r.p80,r.p90,r.sigma,a.actual_qty
  from core.forecast_result r left join (select item_id,date_trunc('month',use_date)::date period,sum(qty)::numeric actual_qty from core.v_test_actual group by item_id,date_trunc('month',use_date)) a using(item_id,period);
create or replace view analytics.v_backtest_run_kpi as select backtest_run_id,count(*)::integer performance_rows,count(distinct model_id)::integer model_count,count(distinct item_id)::integer item_count from core.model_performance group by backtest_run_id;

grant select on analytics.v_model_performance,analytics.v_champion_model,analytics.v_backtest_run,analytics.v_model_comparison,analytics.v_backtest_run_kpi to authenticated;
grant usage on schema core,analytics to authenticated;
alter table core.backtest_run enable row level security; alter table core.model_performance enable row level security; alter table core.champion_model enable row level security;
drop policy if exists backtest_run_admin on core.backtest_run; create policy backtest_run_admin on core.backtest_run for all to authenticated using(core.is_admin()) with check(core.is_admin());
drop policy if exists model_performance_admin on core.model_performance; create policy model_performance_admin on core.model_performance for all to authenticated using(core.is_admin()) with check(core.is_admin());
drop policy if exists champion_admin on core.champion_model; create policy champion_admin on core.champion_model for all to authenticated using(core.is_admin()) with check(core.is_admin());
revoke all on function core.run_backtest(uuid),core.set_manual_champion(text,text,text) from public,anon; grant execute on function core.run_backtest(uuid),core.set_manual_champion(text,text,text) to authenticated;
