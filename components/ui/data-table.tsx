import type { ReactNode } from 'react';

export type DataColumn<T> = { key: string; label: string; align?: 'left' | 'right' | 'center'; render?: (row: T) => ReactNode };

export default function DataTable<T extends Record<string, unknown>>({ columns, rows, rowKey, empty }: { columns: DataColumn<T>[]; rows: T[]; rowKey: (row: T, index: number) => string; empty: ReactNode }) {
  if (rows.length === 0) return <>{empty}</>;
  return <div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th className={column.align ? `align-${column.align}` : undefined} key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowKey(row, rowIndex)}>{columns.map((column) => <td className={column.align ? `align-${column.align}` : undefined} key={column.key}>{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>;
}
