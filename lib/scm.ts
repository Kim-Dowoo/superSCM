import { createSupabaseServerClient } from './supabase';
import { normalizeLeadtimeGap, normalizeStockoutKpi, normalizeStockoutRisk, type ForecastSettings, type LeadtimeGap, type StockoutKpi, type StockoutRisk } from './scm-model';

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
