-- STEP3 적용 후 Supabase SQL Editor에서 실행할 검증 쿼리

-- 학습/검증 기간이 겹치지 않고, 각 뷰가 설정 기간만 반환하는지 확인
select count(*) filter (where use_date between test_start and test_end) as leaked_train_rows
  from core.v_train_demand
 cross join core.forecast_setting
 where setting_id = 'default';

select min(use_date) as train_min_date, max(use_date) as train_max_date,
       (select train_start from core.forecast_setting where setting_id = 'default') as configured_train_start,
       (select train_end from core.forecast_setting where setting_id = 'default') as configured_train_end,
       count(*) as train_rows
  from core.v_train_demand;

select min(use_date) as test_min_date, max(use_date) as test_max_date,
       (select test_start from core.forecast_setting where setting_id = 'default') as configured_test_start,
       (select test_end from core.forecast_setting where setting_id = 'default') as configured_test_end,
       count(*) as test_rows
  from core.v_test_actual;

select * from analytics.v_data_coverage;
