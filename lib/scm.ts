import { createSupabaseServerClient } from './supabase';
import { normalizeLeadtimeGap, normalizeStockoutKpi, normalizeStockoutRisk, type DemandProfile, type ForecastModel, type ForecastRun, type ForecastSettings, type LeadtimeGap, type ModelComparisonPoint, type ModelPerformance, type StockoutKpi, type StockoutRisk } from './scm-model';

export async function getLeadtimeGap(): Promise<{ rows: LeadtimeGap[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_leadtime_gap').select('*');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeLeadtimeGap(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getStockoutKpi(): Promise<{ data: StockoutKpi | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_stockout_kpi').select('*').maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data: data ? normalizeStockoutKpi(data as Record<string, unknown>) : null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getStockoutRisk(): Promise<{ rows: StockoutRisk[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_stockout_risk').select('*');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeStockoutRisk(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getForecastSettings(): Promise<{ data: ForecastSettings | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_forecast_settings').select('*').maybeSingle();
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: null };
    const row = data as Record<string, unknown>;
    const number = (key: string) => typeof row[key] === 'number' ? row[key] as number : Number(row[key] ?? 0);
    return { data: {
      dataStart: row.data_start as string | null,
      dataEnd: row.data_end as string | null,
      trainStart: row.train_start as string | null,
      trainEnd: row.train_end as string | null,
      testStart: row.test_start as string | null,
      testEnd: row.test_end as string | null,
      granularity: String(row.granularity ?? '—'),
      trainRowCount: number('train_row_count'),
      testRowCount: number('test_row_count'),
      trainWindowOk: row.train_window_ok === true,
      testWindowOk: row.test_window_ok === true,
      policyCount: number('policy_count'),
      activeOutlierRuleCount: number('active_outlier_rule_count'),
      itemPolicyCount: number('item_policy_count'),
    }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Forecast 설정 조회에 실패했습니다.' };
  }
}

export async function getDemandProfiles(): Promise<{ rows: DemandProfile[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_sku_demand_profile').select('*');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => { const r = row as Record<string, unknown>; const n = (key: string) => r[key] == null ? null : Number(r[key]); return { itemId: String(r.item_id), itemName: String(r.item_name ?? r.item_id), nPeriods: Number(r.n_periods ?? 0), nNonzeroPeriods: Number(r.n_nonzero_periods ?? 0), adi: n('adi'), cv: n('cv'), cvSquared: n('cv_squared'), zeroDemandRate: n('zero_demand_rate'), trend: n('trend'), recentChangeRate: n('recent_change_rate'), peakPeriod: r.peak_period as string | null, demandType: (r.demand_type as DemandProfile['demandType']) ?? null, seasonality: r.seasonality as string | null, reasonCode: r.reason_code as string | null, stability: r.stability as string | null }; }), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Demand Profile 조회에 실패했습니다.' }; }
}

export async function getForecastModels(): Promise<{ rows: ForecastModel[]; error: string | null }> {
  try { const supabase = await createSupabaseServerClient(); const { data, error } = await supabase.schema('analytics').from('v_model_config').select('*').order('model_id'); if (error) return { rows: [], error: error.message }; return { rows: (data ?? []).map((r) => ({ modelId: String(r.model_id), modelName: String(r.model_name), family: String(r.family), engine: String(r.engine), version: String(r.version), enabled: Boolean(r.enabled), demandTypes: (r.applicable_demand_type ?? []) as string[], parameters: (r.parameters ?? {}) as Record<string, unknown> })), error: null }; } catch (e) { return { rows: [], error: e instanceof Error ? e.message : '모델 조회에 실패했습니다.' }; }
}
export async function getForecastRuns(): Promise<{ rows: ForecastRun[]; error: string | null }> {
  try { const supabase = await createSupabaseServerClient(); const { data, error } = await supabase.schema('analytics').from('v_forecast_run').select('*').order('started_at', { ascending: false }); if (error) return { rows: [], error: error.message }; return { rows: (data ?? []).map((r) => ({ runId: String(r.run_id), status: String(r.status), startedAt: String(r.started_at), finishedAt: r.finished_at as string | null, nModels: Number(r.n_models ?? 0), nItems: Number(r.n_items ?? 0), nRows: Number(r.n_rows ?? 0), dataSnapshotAt: r.data_snapshot_at as string | null, isStale: Boolean(r.is_stale), triggeredEmail: r.triggered_email as string | null })), error: null }; } catch (e) { return { rows: [], error: e instanceof Error ? e.message : 'Forecast 실행 이력 조회에 실패했습니다.' }; }
}
export async function getModelPerformance(): Promise<{ rows: ModelPerformance[]; error: string | null }> { try { const s=await createSupabaseServerClient(); const {data,error}=await s.schema('analytics').from('v_model_performance').select('*').order('item_id').order('rank'); if(error)return{rows:[],error:error.message}; return{rows:(data??[]).map((r)=>({itemId:String(r.item_id),modelId:String(r.model_id),modelVersion:String(r.model_version),nPeriods:Number(r.n_periods??0),wape:r.wape==null?null:Number(r.wape),mape:r.mape==null?null:Number(r.mape),bias:r.bias==null?null:Number(r.bias),rmse:r.rmse==null?null:Number(r.rmse),mae:r.mae==null?null:Number(r.mae),rank:r.rank==null?null:Number(r.rank),status:String(r.calculation_status),reasonCode:r.reason_code as string|null})),error:null}; } catch(e){return{rows:[],error:e instanceof Error?e.message:'성능 조회에 실패했습니다.'};} }
export async function getModelComparison(): Promise<{ rows: ModelComparisonPoint[]; error: string | null }> { try { const s=await createSupabaseServerClient(); const {data,error}=await s.schema('analytics').from('v_model_comparison').select('*').order('period'); if(error)return{rows:[],error:error.message}; return{rows:(data??[]).map((r)=>({itemId:String(r.item_id),modelId:String(r.model_id),period:String(r.period),predictedQty:r.predicted_qty==null?null:Number(r.predicted_qty),actualQty:r.actual_qty==null?null:Number(r.actual_qty)})),error:null}; } catch(e){return{rows:[],error:e instanceof Error?e.message:'비교 데이터 조회에 실패했습니다.'};} }
