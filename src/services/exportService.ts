import * as XLSX from '@e965/xlsx';

type ExportFormat = 'excel' | 'csv';

interface ExportOptions {
  data: Record<string, any>[];
  fileName: string;
  sheetName?: string;
  format?: ExportFormat;
}

export function exportToExcel({ data, fileName, sheetName = 'Sheet1' }: ExportOptions) {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportToCsv({ data, fileName }: ExportOptions) {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportData(opts: ExportOptions) {
  if (opts.format === 'csv') return exportToCsv(opts);
  return exportToExcel(opts);
}
