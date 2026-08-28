# STEP 9 Supabase 적용 안내

Vercel 배포는 Next.js 코드만 배포하며 Supabase migration을 자동 실행하지 않습니다. Supabase Dashboard의 **SQL Editor**에서 아래 migration 파일 전체를 순서대로 실행하세요.

1. `supabase/migrations/20260828000700_step9_inventory_projection.sql` 내용을 SQL Editor에 붙여넣고 Run
2. Settings → API → Exposed schemas에 `core`, `analytics`가 포함되어 있는지 확인
3. SQL Editor에서 결과 확인

```sql
select count(*) from analytics.v_inventory_projection;
select * from analytics.v_stockout_risk order by item_id;
select * from analytics.v_stockout_kpi;
select * from analytics.v_leadtime_policy order by supplier_id;
```

화면 URL:

- `/analysis/inventory-projection`
- `/analysis/stockout`
- `/admin/scm-policies/leadtime`

`NO_FORECAST`, `NO_INVENTORY_DATA`, `NO_LEADTIME`가 표시되는 것은 원본 데이터 또는 STEP 6/7 실행 결과가 아직 없는 상태를 의미합니다. 계산 불가 상태를 0으로 대체하지 않습니다.
