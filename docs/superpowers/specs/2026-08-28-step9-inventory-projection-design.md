# STEP 9 Lead Time 정책화와 Inventory Projection 설계

## 목표

기존 `available_inventory ÷ average_usage` Stockout 계산을 폐기하고, STEP 7 Champion Forecast·현재 재고·예정 Open PO·확정수주·Soft Allocation·Effective Lead Time을 결합한 기간별 Inventory Projection으로 교체한다. 기존 `/analysis/stockout` URL과 analytics 조회 원칙은 유지한다.

## 데이터 흐름

```text
core.v_item_master ─┐
core.v_stock_on_hand ├─> analytics.v_inventory_projection ─> analytics.v_stockout_risk
core.v_leadtime_effective ┤                                  └> analytics.v_stockout_kpi
core.forecast_result ┤
raw.purchase_order ──┤
raw.sales_order ─────┤
core.soft_allocation ┘
```

Projection은 `core.forecast_result`에서 Champion 모델 결과를 우선 사용한다. Champion이 없거나 Forecast가 없는 SKU는 임의 수요를 대체하지 않고 `CALCULATION_UNAVAILABLE`과 `NO_FORECAST`를 반환한다.

## Lead Time 정책과 이력

기존 `core.leadtime_plan`의 관리자 확정값을 유지하고, `core.leadtime_plan_history`를 추가한다. 변경 전/후 값, 변경자, 변경일, 사유를 한 행씩 기록하는 트리거 또는 ADMIN 전용 RPC를 사용한다. `core.v_leadtime_effective`는 확정값을 먼저 선택하고, 없으면 `core.v_leadtime_stat.p80_days`를 사용한다. 두 값이 모두 없으면 `effective_lead_time`을 NULL로 유지하고 `NO_LEADTIME`을 기록한다.

## Projection 계산 규칙

기간별 기말 재고는 다음 식을 따른다.

```text
ending_inventory = beginning_inventory
                 + scheduled_receipt
                 - confirmed_sales_order
                 - soft_allocation
                 - forecast_demand
```

- 첫 기간의 `beginning_inventory`는 `core.v_stock_on_hand`의 현재고이며, 행이 없으면 NULL/`NO_INVENTORY_DATA`다.
- Open PO는 `납기예정일`이 해당 기간에 속할 때만 더한다. 미래 전체 입고를 현재고에 미리 합산하지 않는다.
- Sales Order는 `status='CONFIRMED'`인 행만 확정수주로 차감한다. 상태가 불명확한 행은 확정수주로 사용하지 않는다.
- `core.soft_allocation`에 명시적 행이 없으면 `soft_allocation_missing=true`와 함께 구조적 0으로 표시하고, 명시적 0 행은 `soft_allocation_missing=false`로 구분한다.
- Forecast는 확정수주와 별도 컬럼으로 저장해 중복 차감 여부를 추적한다.

## Stockout와 공급일수

Projection 기간 중 `ending_inventory <= 0`인 최초 기간을 `stockout_period`로 선택한다. 기간 데이터가 없거나 필수 입력이 NULL이면 날짜를 생성하지 않는다. `days_of_supply`와 `months_of_supply`는 저장된 Forecast 수요만으로 계산하며, 분모가 0이거나 Forecast가 없으면 NULL과 사유 코드를 반환한다.

## Risk 정책

`core.policy_config`에서 `stockout_warning_days`, `stockout_critical_days` 및 관련 정책을 읽는다. 기본 판정은 다음과 같다.

- `SAFE`: 결품 기간이 없음
- `WARNING`: 결품이 예상되지만 Effective Lead Time 내 대응 가능
- `CRITICAL`: 결품 기간이 예상 입고 시점보다 빠름
- `CALCULATION_UNAVAILABLE`: 재고·Lead Time·Forecast 등 필수 데이터 부족

정책값이 없으면 임의 기본값을 쓰지 않고 정책 미설정 사유를 남긴다.

## 권한과 화면

ADMIN만 Lead Time 확정값 변경 RPC를 호출할 수 있으며 DB RLS도 `core.is_admin()`으로 재검증한다. 일반 USER는 `analytics.v_leadtime_policy`, `analytics.v_inventory_projection`, `analytics.v_stockout_risk`를 조회한다. `/admin/scm-policies/leadtime`는 실적 P50/P80/P90, 확정값, Effective 값과 이력을 표시하고 `/analysis/stockout`는 Projection 상세 컬럼을 표시한다.

## 검증 계획

- 재고 충분/결품 없음 → SAFE
- Lead Time 전 결품과 입고 예정 비교 → WARNING/CRITICAL
- 재고·Lead Time·Forecast 누락 → 각 reason code와 NULL
- Open PO가 예정 기간에만 반영되는지
- CONFIRMED Sales Order와 Soft Allocation 차감
- 관리자 확정값 우선, 미확정 시 P80 fallback
- 기존 단순 평균 방식의 0 fallback이 제거됐는지 정적 검색
- SQL view 결과를 통한 `npm test`와 `npm run build`
