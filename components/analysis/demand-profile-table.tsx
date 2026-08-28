'use client';
import { useMemo, useState } from 'react';
import Badge, { type StatusTone } from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import type { DemandProfile, DemandType } from '@/lib/scm-model';

const tone: Record<DemandType, StatusTone> = { SMOOTH: 'SAFE', INTERMITTENT: 'WARNING', ERRATIC: 'CRITICAL', LUMPY: 'CRITICAL' };
export default function DemandProfileTable({ rows }: { rows: DemandProfile[] }) {
  const [type, setType] = useState('ALL'); const [availability, setAvailability] = useState('ALL'); const [query, setQuery] = useState('');
  const filtered = useMemo(() => rows.filter((row) => (type === 'ALL' || row.demandType === type) && (availability === 'ALL' || (availability === 'AVAILABLE' ? !row.reasonCode : Boolean(row.reasonCode))) && row.itemId.toLowerCase().includes(query.toLowerCase())), [rows, type, availability, query]);
  const value = (number: number | null, reason: string | null) => number == null ? <EmptyValue reasonCode={reason ?? 'CALCULATION_UNAVAILABLE'} /> : number.toFixed(2);
  return <><div className="filter-row"><input aria-label="SKU 검색" placeholder="SKU 검색" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Demand Type" value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">전체 유형</option>{['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'].map((item) => <option key={item}>{item}</option>)}</select><select aria-label="계산 상태" value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="ALL">전체 상태</option><option value="AVAILABLE">계산 가능</option><option value="UNAVAILABLE">계산 불가</option></select></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>SKU</th><th>품목명</th><th>ADI</th><th>CV²</th><th>Zero-demand Rate</th><th>Trend</th><th>Demand Type</th><th>Seasonality</th><th>Reason</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.itemId}><td>{row.itemId}</td><td>{row.itemName}</td><td>{value(row.adi, row.reasonCode)}</td><td>{value(row.cvSquared, row.reasonCode)}</td><td>{value(row.zeroDemandRate, row.reasonCode)}</td><td>{value(row.trend, row.reasonCode)}</td><td>{row.demandType ? <Badge status={tone[row.demandType]} label={row.demandType} /> : <EmptyValue reasonCode={row.reasonCode ?? 'CALCULATION_UNAVAILABLE'} />}</td><td>{row.seasonality ?? <EmptyValue reasonCode={row.reasonCode ?? 'CALCULATION_UNAVAILABLE'} />}</td><td>{row.reasonCode ?? '—'}</td></tr>)}</tbody></table></div><p className="muted">{filtered.length}개 SKU 표시</p></>;
}
