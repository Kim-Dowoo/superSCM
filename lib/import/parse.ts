import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ImportRow } from './types.ts';

export async function parseImportFile(file: File): Promise<{ rows: ImportRow[]; columns: string[] }> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    const result = Papa.parse<ImportRow>(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
    if (result.errors.length) throw new Error(`CSV_PARSE_ERROR: ${result.errors[0].message}`);
    const rows = result.data;
    return { rows, columns: result.meta.fields ?? [] };
  }
  if (name.endsWith('.xlsx')) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('XLSX_SHEET_MISSING: 첫 번째 시트를 찾을 수 없습니다.');
    const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: null, raw: false });
    return { rows, columns: rows.length ? Object.keys(rows[0]) : [] };
  }
  throw new Error('FILE_TYPE_UNSUPPORTED: CSV 또는 XLSX 파일만 지원합니다.');
}
