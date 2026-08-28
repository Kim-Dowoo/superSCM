# STEP 8 Python Forecast Service 설계

## 목표

STEP 6의 SQL Baseline Forecast 계약을 유지하면서 FastAPI 기반 Python 모델을 추가한다. Python 모델은 학습 구간(`core.v_train_demand`)만 사용하고, 동일한 `forecast_run`·`model_version`·`forecast_result` 구조에 결과를 저장해 STEP 7 Backtest와 Champion 후보에 자동 편입한다.

## 아키텍처

`forecast-service/`는 Next.js와 독립된 FastAPI 애플리케이션이다. 서비스는 서버 전용 Supabase service-role 키로만 DB에 접근하며, 브라우저에는 키를 전달하지 않는다. 모델 계산은 Python에서 수행하고, 실행 이력·버전 스냅샷·결과 저장은 기존 `core` 테이블 계약을 사용한다.

```text
Next.js Admin Route (ADMIN 인증)
        │ POST /forecast/run 또는 /backtest/run
        ▼
FastAPI forecast-service
  ├─ model registry (PYTHON model_config)
  ├─ train loader (core.v_train_demand only)
  ├─ forecast models (common interface)
  └─ repository (forecast_run/model_version/result)
        │
        ▼
Supabase core + analytics views
```

## 모델 인터페이스와 등록

모든 모델은 다음 인터페이스를 구현한다.

```python
forecast(train_df: pandas.DataFrame, horizon: int, params: dict) -> pandas.DataFrame
```

반환 DataFrame은 `item_id`, `period`, `predicted_qty`, `p50`, `p80`, `p90`, `sigma`, `basis` 컬럼을 가진다. 모델 레지스트리는 `core.model_config`의 `engine='PYTHON'` 행을 사용한다. 기본 등록 모델은 `EXPONENTIAL_SMOOTHING`, `HOLT_WINTERS`, `CROSTON`, `SBA`, `TSB`이며, `SARIMA`, `PROPHET`, `XGBOOST`는 선택적 의존성을 플러그인으로 지원한다. 의존성이 없거나 학습 데이터가 부족하면 임의 예측 대신 계산 불가 상태와 오류 메시지를 남긴다.

## 데이터 격리와 재현성

- 학습 데이터는 `core.v_train_demand`에서만 읽는다.
- `core.v_test_actual` 및 `raw.usage_history`는 Python Forecast 경로에서 조회하지 않는다.
- 실행 시작 시 `core.forecast_run.data_snapshot_at`을 기록한다.
- 활성 모델의 `version`, `parameters`, 모델 정의를 `core.model_version`에 실행별로 스냅샷한다.
- 동일한 학습 데이터 스냅샷과 동일한 모델 정의면 같은 결과를 재현할 수 있도록 정렬·시드·반올림 규칙을 고정한다.

## API

- `GET /health`: 서비스 및 DB 연결 상태
- `GET /models`: 활성 Python 모델과 적용 수요 유형
- `POST /forecast/run`: ADMIN이 학습 구간 Forecast Run을 생성하고 결과를 저장
- `POST /backtest/run`: 저장된 Forecast Result와 DB의 검증 Actual을 사용해 STEP 7 Backtest RPC를 호출

요청에는 브라우저가 임의로 role을 전달하지 않는다. Next.js Route Handler에서 `requireAdmin()`을 호출하고, DB RPC도 ADMIN 정책으로 재검증한다.

## 저장·실패 처리

1. 설정과 활성 Python 모델을 조회한다.
2. `forecast_run`을 `RUNNING`으로 생성한다.
3. 모델 버전 스냅샷을 저장한다.
4. `v_train_demand`를 모델별로 전달해 Forecast를 계산한다.
5. `forecast_result`를 `run_id/model_id/model_version`으로 삽입한다.
6. 집계값을 갱신하고 Run을 `SUCCESS`로 종료한다.
7. 예외가 나면 Run을 `FAILED`로 남기고 `message`에 원인을 기록한다.

기존 성공 Run과 결과는 삭제·덮어쓰기하지 않는다. Python 서비스가 중단되어도 Next.js는 저장된 analytics Forecast/Backtest 결과를 계속 조회한다.

## 권한

anon은 모든 실행·저장을 거부한다. 일반 USER는 기존 정책 범위에서 analytics 결과를 조회할 수 있다. Forecast/Backtest 실행과 모델 설정 변경은 ADMIN만 허용한다. service-role 키는 서버 환경변수(`SUPABASE_SERVICE_ROLE_KEY`)로만 관리한다.

## 검증 계획

- 공통 인터페이스 반환 스키마와 음수/NaN 방지
- Croston/SBA/TSB 간헐수요 계산 및 데이터 부족 처리
- Holt-Winters·SARIMA 선택적 의존성 미설치 시 안전한 실패
- `/health`, `/models`, 실행 성공·실패 API
- `run_id`·`model_version` 스냅샷 저장
- test 데이터가 학습 경로에 유입되지 않는지 정적 검색과 테스트
- 기존 `npm test`, `npm run build` 및 Python `pytest`
