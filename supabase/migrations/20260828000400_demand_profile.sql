-- STEP 5: 학습 기간 기반 SKU Demand Profile

create or replace view analytics.v_sku_demand_profile as
with setting as (
  select train_start, train_end
    from core.forecast_setting
   where setting_id = 'default'
), months as (
  select row_number() over (order by month_start)::integer as period_index,
         month_start::date as period
    from setting,
         generate_series(date_trunc('month', train_start), date_trunc('month', train_end), interval '1 month') as month_start
   where train_start is not null and train_end is not null
), items as (
  select distinct item_id from core.v_item_master where item_id is not null
  union
  select distinct item_id from core.v_train_demand where item_id is not null
), grid as (
  select i.item_id, m.period_index, m.period
    from items i cross join months m
), monthly as (
  select g.item_id, g.period_index, g.period,
         count(d.*)::integer as source_row_count,
         count(d.qty)::integer as nonnull_qty_count,
         sum(d.qty)::numeric as summed_qty
    from grid g
    left join core.v_train_demand d
      on d.item_id = g.item_id
     and date_trunc('month', d.use_date)::date = g.period
   group by g.item_id, g.period_index, g.period
), valueset as (
  select *,
         case when source_row_count = 0 then 0::numeric
              when nonnull_qty_count = 0 then null::numeric
              else summed_qty end as quantity
    from monthly
), numbered as (
  select v.*, count(*) over (partition by item_id)::integer as period_count
    from valueset v
), stats as (
  select item_id,
         count(*)::integer as n_periods,
         count(*) filter (where quantity > 0)::integer as n_nonzero_periods,
         count(*) filter (where quantity is null)::integer as n_null_periods,
         avg(quantity) filter (where quantity > 0)::numeric as positive_mean,
         stddev_samp(quantity) filter (where quantity > 0)::numeric as positive_sd,
         avg(quantity) filter (where quantity is not null)::numeric as all_mean,
         min(quantity) filter (where quantity is not null)::numeric as min_quantity,
         max(quantity) filter (where quantity is not null)::numeric as max_quantity,
         regr_slope(quantity, period_index) filter (where quantity is not null)::numeric as trend,
         avg(quantity) filter (where period_index > period_count - 3 and quantity is not null)::numeric as recent_mean,
         avg(quantity) filter (where period_index > period_count - 6 and period_index <= period_count - 3 and quantity is not null)::numeric as prior_mean
    from numbered
   group by item_id
), calculated as (
  select s.*, case when positive_mean > 0 then positive_sd / positive_mean else null end as cv
    from stats s
), named as (
  select c.item_id,
         coalesce(im.item_name, c.item_id) as item_name,
         c.n_periods,
         c.n_nonzero_periods,
         case when c.n_nonzero_periods > 0 then c.n_periods::numeric / c.n_nonzero_periods else null end as adi,
         c.cv,
         case when c.cv is not null then c.cv * c.cv else null end as cv_squared,
         case when c.n_null_periods = 0 and c.n_periods > 0 then (c.n_periods - c.n_nonzero_periods)::numeric / c.n_periods else null end as zero_demand_rate,
         c.trend,
         case when c.prior_mean is not null and c.prior_mean <> 0 then (c.recent_mean - c.prior_mean) / abs(c.prior_mean) else null end as recent_change_rate,
         (select v.period from valueset v where v.item_id = c.item_id and v.quantity = c.max_quantity order by v.period asc limit 1) as peak_period,
         case when c.n_nonzero_periods = 0 then null
              when c.cv is null or c.n_nonzero_periods < 2 then null
              when c.n_periods::numeric / c.n_nonzero_periods < 1.32 and c.cv * c.cv < 0.49 then 'SMOOTH'
              when c.n_periods::numeric / c.n_nonzero_periods >= 1.32 and c.cv * c.cv < 0.49 then 'INTERMITTENT'
              when c.n_periods::numeric / c.n_nonzero_periods < 1.32 and c.cv * c.cv >= 0.49 then 'ERRATIC'
              else 'LUMPY' end as demand_type,
         case when c.n_periods < 24 then null
              when c.all_mean is null or c.all_mean = 0 then null
              when (c.max_quantity - c.min_quantity) / abs(c.all_mean) >= 0.2 then 'DETECTED'
              else 'NOT_DETECTED' end as seasonality,
         case when c.n_nonzero_periods = 0 then 'NO_DEMAND'
              when c.n_null_periods > 0 then 'NULL_QUANTITY'
              when c.n_nonzero_periods < 2 then 'INSUFFICIENT_OBSERVATIONS'
              when c.n_periods < 24 then 'INSUFFICIENT_PERIODS'
              else null end as reason_code,
         case when c.cv is null then null when c.cv * c.cv < 0.49 then 'STABLE' else 'VARIABLE' end as stability
    from calculated c
    left join core.v_item_master im on im.item_id = c.item_id
)
select * from named;

create or replace view analytics.v_demand_profile_kpi as
select count(*)::integer as total_items,
       count(*) filter (where demand_type = 'SMOOTH')::integer as n_smooth,
       count(*) filter (where demand_type = 'INTERMITTENT')::integer as n_intermittent,
       count(*) filter (where demand_type = 'ERRATIC')::integer as n_erratic,
       count(*) filter (where demand_type = 'LUMPY')::integer as n_lumpy,
       count(*) filter (where demand_type in ('INTERMITTENT','LUMPY'))::integer as n_croston_needed,
       count(*) filter (where reason_code is not null)::integer as n_calculation_unavailable
  from analytics.v_sku_demand_profile;

grant select on analytics.v_sku_demand_profile, analytics.v_demand_profile_kpi to authenticated;
