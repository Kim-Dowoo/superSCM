import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import DataManagementForm from '@/components/admin/data-management-form';
import { requireAdmin } from '@/lib/auth';
import { getImportHistory } from '@/lib/import/history';
import { rollbackImport } from './actions';

export const dynamic = 'force-dynamic';
export default async function DataManagementPage() {
  await requireAdmin();
  const { data, error } = await getImportHistory();
  return <div className="page-content"><PageHeader title="데이터 관리" description="파일을 staging에서 검증한 뒤 승인된 행만 RAW에 적재합니다." /><DataManagementForm /><Panel title="Import History">{error ? <p className="text-critical">조회에 실패했습니다: {error.message}</p> : data?.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>파일명</th><th>타입</th><th>모드</th><th>총 행</th><th>성공</th><th>경고</th><th>오류</th><th>상태</th><th>관리</th></tr></thead><tbody>{data.map((row) => <tr key={String(row.batch_id)}><td>{row.file_name}</td><td>{row.import_type}</td><td>{row.import_mode}</td><td>{row.total_rows}</td><td>{row.success_rows}</td><td>{row.warning_rows}</td><td>{row.error_rows}</td><td>{row.status}</td><td><a className="button" href={`/api/admin/import-errors/${row.batch_id}`}>오류 CSV</a>{row.status === 'IMPORTED' && row.import_mode !== 'replace' ? <form action={rollbackImport}><input name="batchId" type="hidden" value={row.batch_id} /><button className="button" type="submit">Rollback</button></form> : null}</td></tr>)}</tbody></table></div> : <p>적재 이력이 없습니다.</p>}</Panel></div>;
}
