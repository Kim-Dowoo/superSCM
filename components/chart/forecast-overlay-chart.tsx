'use client';
import type { ModelComparisonPoint } from '@/lib/scm-model';
export default function ForecastOverlayChart({ points, enabledModels }: { points: ModelComparisonPoint[]; enabledModels: string[] }) {
  const visible = points.filter((point) => enabledModels.includes(point.modelId));
  return <div className="chart-wrapper" aria-label="Actual과 모델별 Forecast 비교"><div className="chart-legend">Actual · {enabledModels.join(' · ')}</div><div className="chart-series">{visible.slice(0, 36).map((point, index) => <div className="chart-row" key={`${point.modelId}-${point.period}-${index}`}><span>{point.period}</span><span>Actual {point.actualQty ?? '—'} · {point.modelId} {point.predictedQty ?? '—'}</span></div>)}</div></div>;
}
