-- STEP 9: Lead Time 정책화와 Forecast 기반 Inventory Projection

create table if not exists core.leadtime_plan_history (
  history_id uuid primary key default gen_random_uuid(),
  supplier_id text not null,
  before_lead_time integer,
  after_lead_time integer,
  reason text not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create table if not exists core.soft_allocation (
  allocation_id uuid primary key default gen_random_uuid(),
  item_id text not null,
  period date not null,
  quantity numeric not null check (quantity >= 0),
  source text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists soft_allocation_item_period_idx on core.soft_allocation(item_id, period);

create or replace function core.record_leadtime_plan_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (old.planned_lead_time is distinct from new.planned_lead_time) then
    insert into core.leadtime_plan_history(supplier_id,before_lead_time,after_lead_time,reason,changed_by)
    values(new.supplier_id,old.planned_lead_time,new.planned_lead_time,coalesce(new.confirmed_reason,'정책 변경'),auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists leadtime_plan_history_trigger on core.leadtime_plan;
create trigger leadtime_plan_history_trigger after update on core.leadtime_plan
for each row execute function core.record_leadtime_plan_change();

-- 확정 Lead Time이 있으면 우선하고, 없을 때만 실적 P80을 사용합니다.
create or replace view core.v_leadtime_effective as
select st.supplier_id, st.supplier_name, st.country, st.n_samples, st.p80_days,
       p.planned_lead_time,
       coalesce(p.planned_lead_time, st.p80_days) as effective_lead_time,
       case when p.planned_lead_time is not null then 'CONFIRMED' else 'P80' end as source
from core.v_leadtime_stat st
left join core.leadtime_plan p on p.supplier_id = st.supplier_id;

create or replace function core.admin_set_leadtime(
  target_supplier_id text, next_lead_time integer, reason_text text
) returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); previous integer;
begin
  if not core.is_admin() then raise exception '관리자만 Lead Time을 변경할 수 있습니다.' using errcode='42501'; end if;
  if nullif(trim(reason_text),'') is null then raise exception '변경 사유는 필수입니다.' using errcode='22023'; end if;
  if next_lead_time is not null and next_lead_time <= 0 then raise exception 'Lead Time은 0보다 커야 합니다.' using errcode='22023'; end if;
  select planned_lead_time into previous from core.leadtime_plan where supplier_id=target_supplier_id;
  insert into core.leadtime_plan(supplier_id,planned_lead_time,basis,confirmed_reason,confirmed_at)
  values(target_supplier_id,next_lead_time,'ADMIN',reason_text,now())
  on conflict (supplier_id) do update set planned_lead_time=excluded.planned_lead_time,basis=excluded.basis,confirmed_reason=excluded.confirmed_reason,confirmed_at=excluded.confirmed_at;
  insert into core.audit_log(actor,action,target_type,target_id,before,after)
  values(actor,'UPDATE_LEADTIME_POLICY','supplier',gen_random_uuid(),jsonb_build_object('supplier_id',target_supplier_id,'planned_lead_time',previous),jsonb_build_object('supplier_id',target_supplier_id,'planned_lead_time',next_lead_time,'reason',reason_text));
end;
$$;

create or replace view analytics.v_leadtime_policy as
select e.supplier_id,e.supplier_name,e.country,e.n_samples,e.p50_days,e.p80_days,e.p90_days,
       e.planned_lead_time as confirmed_lead_time,e.effective_lead_time,e.source,
       p.confirmed_at
from core.v_leadtime_stat e
left join core.leadtime_plan p on p.supplier_id=e.supplier_id;

create or replace view analytics.v_inventory_projection as
with latest_run as (
  select run_id from core.forecast_run where status='SUCCESS' order by finished_at desc nulls last, started_at desc limit 1
), periods as (
  select distinct fr.item_id, fr.period
  from core.forecast_result fr join latest_run r on r.run_id=fr.run_id
), items as (
  select i.item_id,i.item_name,i.supplier_id,st.current_stock
  from core.v_item_master i left join core.v_stock_on_hand st on st.item_id=i.item_id
  where i.is_active='Y'
), grid as (
  select i.*,p.period from items i join periods p on p.item_id=i.item_id
), forecast as (
  select fr.item_id,fr.period,fr.predicted_qty,fr.model_id,fr.model_version
  from core.forecast_result fr join latest_run r on r.run_id=fr.run_id
  join lateral (select c.champion_model_id,c.model_version from core.champion_model c where c.item_id=fr.item_id order by c.selected_at desc limit 1) ch on ch.champion_model_id=fr.model_id and ch.model_version=fr.model_version
), receipts as (
  select upper(regexp_replace(coalesce("품목코드",''),'[\\s\\-_]','','g')) item_id,
         case when "납기예정일" ~ '^\\d{4}[-/]\\d{2}[-/]\\d{2}$' then replace("납기예정일",'/','-')::date end receipt_date,
         case when "발주수량" ~ '^[-+]?\\d+(\\.\\d+)?$' then "발주수량"::numeric end quantity
  from raw.purchase_order
), receipt_by_period as (
  select g.item_id,g.period,coalesce(sum(r.quantity) filter(where date_trunc('month',r.receipt_date)::date=g.period),0) scheduled_receipt
  from grid g left join receipts r on r.item_id=g.item_id group by g.item_id,g.period
), orders as (
  select upper(regexp_replace(coalesce(item_id,''),'[\\s\\-_]','','g')) item_id,date_trunc('month',order_date)::date period,sum(quantity) quantity
  from raw.sales_order where upper(status)='CONFIRMED' group by 1,2
), allocations as (
  select item_id,date_trunc('month',period)::date period,sum(quantity) quantity from core.soft_allocation group by 1,2
), base as (
  select g.*,f.predicted_qty forecast_demand,f.model_id,f.model_version,r.scheduled_receipt,
         coalesce(o.quantity,0) confirmed_sales_order,coalesce(a.quantity,0) soft_allocation,
         (a.item_id is null) soft_allocation_missing
  from grid g left join forecast f using(item_id,period) join receipt_by_period r using(item_id,period)
  left join orders o using(item_id,period) left join allocations a using(item_id,period)
), calc as (
  select b.*,sum(case when b.forecast_demand is null then 1 else 0 end) over(partition by item_id order by period rows between unbounded preceding and current row) missing_forecast,
         sum(b.scheduled_receipt-b.confirmed_sales_order-b.soft_allocation-coalesce(b.forecast_demand,0)) over(partition by item_id order by period rows between unbounded preceding and current row) net_change,
         sum(b.scheduled_receipt-b.confirmed_sales_order-b.soft_allocation-coalesce(b.forecast_demand,0)) over(partition by item_id order by period rows between unbounded preceding and 1 preceding) prior_net_change,
         row_number() over(partition by item_id order by period) rn
  from base b
)
select c.item_id,c.item_name,c.supplier_id,c.period,
       case when c.current_stock is null or c.missing_forecast>0 then null else c.current_stock+coalesce(c.prior_net_change,0) end beginning_inventory,
       c.scheduled_receipt,c.confirmed_sales_order,c.soft_allocation,c.soft_allocation_missing,
       c.forecast_demand,c.model_id,c.model_version,
       case when c.current_stock is null then null when c.missing_forecast>0 then null else c.current_stock+c.net_change end ending_projected_inventory,
       case when c.current_stock is null then 'NO_INVENTORY_DATA' when c.missing_forecast>0 then 'NO_FORECAST' end reason_code
from calc c;

drop view if exists analytics.v_stockout_kpi;
drop view if exists analytics.v_stockout_risk;
create view analytics.v_stockout_risk as
with projection as (select * from analytics.v_inventory_projection), first_stockout as (
  select item_id,min(period) stockout_period from projection where ending_projected_inventory<=0 group by item_id
), latest as (select distinct on(item_id) item_id,item_name,supplier_id,current_stock from projection order by item_id,period), lt as (
  select i.item_id,e.effective_lead_time from core.v_item_master i left join core.v_leadtime_effective e on e.supplier_id=i.supplier_id
), summary as (
  select l.item_id,l.item_name,l.supplier_id,l.current_stock,fs.stockout_period,lt.effective_lead_time,
         min(p.reason_code) filter(where p.reason_code is not null) reason_code,
         avg(nullif(p.forecast_demand,0)) forecast_avg
  from latest l left join first_stockout fs using(item_id) left join lt using(item_id) left join projection p using(item_id)
  group by l.item_id,l.item_name,l.supplier_id,l.current_stock,fs.stockout_period,lt.effective_lead_time
)
select s.item_id,s.item_name,s.supplier_id,s.current_stock,
       case when s.reason_code is not null then null else (select sum(scheduled_receipt) from projection p where p.item_id=s.item_id) end inbound_qty,
       case when s.reason_code is not null then null else s.current_stock+(select sum(scheduled_receipt) from projection p where p.item_id=s.item_id) end available_qty,
       s.stockout_period,s.effective_lead_time planned_lead_time,
       case when s.reason_code is not null then null when s.forecast_avg is null or s.forecast_avg=0 then null else greatest((s.current_stock / s.forecast_avg)*30,0) end days_of_supply,
       case when s.reason_code is not null then 'CALCULATION_UNAVAILABLE' when s.stockout_period is null then 'SAFE' when s.effective_lead_time is null then 'CALCULATION_UNAVAILABLE' when s.stockout_period <= (date_trunc('month',current_date)::date + (s.effective_lead_time || ' days')::interval)::date then 'CRITICAL' else 'WARNING' end risk_status,
       coalesce(s.reason_code,case when s.effective_lead_time is null then 'NO_LEADTIME' when s.stockout_period is not null and s.stockout_period <= (date_trunc('month',current_date)::date + (s.effective_lead_time || ' days')::interval)::date then null end) reason
from summary s;

create or replace view analytics.v_stockout_kpi as
select count(*)::integer n_items,
       count(*) filter(where risk_status='CRITICAL')::integer n_critical,
       count(*) filter(where risk_status='WARNING')::integer n_warning,
       count(*) filter(where risk_status='SAFE')::integer n_safe,
       count(*) filter(where risk_status='CALCULATION_UNAVAILABLE')::integer n_calculation_unavailable,
       avg(days_of_supply) avg_days_of_supply
from analytics.v_stockout_risk;

grant usage on schema core,analytics to authenticated;
grant select on analytics.v_leadtime_policy,analytics.v_inventory_projection,analytics.v_stockout_risk,analytics.v_stockout_kpi to authenticated;
grant select on core.leadtime_plan_history,core.soft_allocation to authenticated;
grant execute on function core.admin_set_leadtime(text,integer,text) to authenticated;
alter table core.leadtime_plan_history enable row level security;
alter table core.soft_allocation enable row level security;
drop policy if exists leadtime_history_admin_select on core.leadtime_plan_history;
create policy leadtime_history_admin_select on core.leadtime_plan_history for select to authenticated using(core.is_admin());
drop policy if exists soft_allocation_authenticated_select on core.soft_allocation;
create policy soft_allocation_authenticated_select on core.soft_allocation for select to authenticated using(true);
drop policy if exists soft_allocation_admin_write on core.soft_allocation;
create policy soft_allocation_admin_write on core.soft_allocation for all to authenticated using(core.is_admin()) with check(core.is_admin());
revoke all on function core.admin_set_leadtime(text,integer,text) from public,anon;
