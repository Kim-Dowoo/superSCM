export type LeadtimeGap = {
  supplier: string;
  country: string;
  masterLeadTime: number | null;
  sampleCount: number;
  actualAverage: number | null;
  p80: number | null;
  gap: number | null;
};

export type StockoutRiskStatus = 'SAFE' | 'CRITICAL' | 'UNKNOWN';
export type StockoutReason = 'NO_USAGE' | 'NO_LEADTIME' | null;

export type StockoutRisk = {
  itemId: string;
  itemName: string;
  supplierId: string;
  currentStock: number | null;
  inboundQty: number | null;
  availableQty: number | null;
  dailyUsageAvg: number | null;
  cv: number | null;
  plannedLeadTime: number | null;
  stockoutDays: number | null;
  stockoutDate: string | null;
  riskStatus: StockoutRiskStatus;
  reason: StockoutReason;
};

export type StockoutKpi = {
  nItems: number;
  nCritical: number;
  nSafe: number;
  nUnknown: number;
  nWithin30d: number;
  avgStockoutDays: number | null;
};

export type ForecastSettings = {
  dataStart: string | null;
  dataEnd: string | null;
  trainStart: string | null;
  trainEnd: string | null;
  testStart: string | null;
  testEnd: string | null;
  granularity: string;
  trainRowCount: number;
  testRowCount: number;
  trainWindowOk: boolean;
  testWindowOk: boolean;
  policyCount: number;
  activeOutlierRuleCount: number;
  itemPolicyCount: number;
};

export type DemandType = 'SMOOTH' | 'INTERMITTENT' | 'ERRATIC' | 'LUMPY';
export type DemandProfile = {
  itemId: string; itemName: string; nPeriods: number; nNonzeroPeriods: number;
  adi: number | null; cv: number | null; cvSquared: number | null; zeroDemandRate: number | null;
  trend: number | null; recentChangeRate: number | null; peakPeriod: string | null;
  demandType: DemandType | null; seasonality: string | null; reasonCode: string | null; stability: string | null;
};

function value(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return null;
}

function numberValue(row: Record<string, unknown>, keys: string[]) {
  const raw = value(row, keys);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeLeadtimeGap(row: Record<string, unknown>): LeadtimeGap {
  return {
    supplier: String(value(row, ['supplier_name', 'supplier', '법인', '공급처', '공급업체명']) ?? '미정'),
    country: String(value(row, ['country', '국가']) ?? '미정'),
    masterLeadTime: numberValue(row, ['std_lead_time', 'master_lt', 'master_lead_time', 'planned_lead_time', '표준리드타임', '표준리드타임(일)', '마스터값']),
    sampleCount: numberValue(row, ['n_samples', 'sample_count', 'samples', '표본수']) ?? 0,
    actualAverage: numberValue(row, ['mean_days', 'actual_avg', 'actual_average', 'avg_lead_time', '실적평균']),
    p80: numberValue(row, ['p80_days', 'p80', 'P80']),
    gap: numberValue(row, ['gap_days', 'gap', 'leadtime_gap', '격차']),
  };
}

function stringValue(row: Record<string, unknown>, keys: string[], fallback: string) {
  return String(value(row, keys) ?? fallback);
}

function statusValue(row: Record<string, unknown>): StockoutRiskStatus {
  const status = String(value(row, ['risk_status', 'riskStatus', '위험상태', '위험도']) ?? 'UNKNOWN').toUpperCase();
  return status === 'SAFE' || status === 'CRITICAL' ? status : 'UNKNOWN';
}

function reasonValue(row: Record<string, unknown>): StockoutReason {
  const reason = value(row, ['reason', '사유']);
  if (reason === 'NO_USAGE' || reason === 'NO_LEADTIME') return reason;
  return null;
}

export function normalizeStockoutRisk(row: Record<string, unknown>): StockoutRisk {
  return {
    itemId: stringValue(row, ['item_id', 'itemId', '품목코드', '품목ID'], '미정'),
    itemName: stringValue(row, ['item_name', 'itemName', '품목명'], '미정'),
    supplierId: stringValue(row, ['supplier_id', 'supplierId', '공급처코드', '공급처ID'], '미정'),
    currentStock: numberValue(row, ['current_stock', 'currentStock', '현재고']),
    inboundQty: numberValue(row, ['inbound_qty', 'inboundQty', '입고예정']),
    availableQty: numberValue(row, ['available_qty', 'availableQty', '가용재고']),
    dailyUsageAvg: numberValue(row, ['daily_usage_avg', 'dailyUsageAvg', '일평균사용량']),
    cv: numberValue(row, ['cv', '변동계수']),
    plannedLeadTime: numberValue(row, ['planned_lead_time', 'plannedLeadTime', '계획리드타임']),
    stockoutDays: numberValue(row, ['stockout_days', 'stockoutDays', '소진예상일']),
    stockoutDate: value(row, ['stockout_date', 'stockoutDate', '소진예상일자']) as string | null,
    riskStatus: statusValue(row),
    reason: reasonValue(row),
  };
}

export function normalizeStockoutKpi(row: Record<string, unknown>): StockoutKpi {
  return {
    nItems: numberValue(row, ['n_items', 'nItems', '품목수']) ?? 0,
    nCritical: numberValue(row, ['n_critical', 'nCritical', '위험품목수']) ?? 0,
    nSafe: numberValue(row, ['n_safe', 'nSafe', '안전품목수']) ?? 0,
    nUnknown: numberValue(row, ['n_unknown', 'nUnknown', '미산출품목수']) ?? 0,
    nWithin30d: numberValue(row, ['n_within_30d', 'nWithin30d', '30일내소진수']) ?? 0,
    avgStockoutDays: numberValue(row, ['avg_stockout_days', 'avgStockoutDays', '평균소진일'])
  };
}
