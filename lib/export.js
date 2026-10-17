import * as XLSX from 'xlsx';

// sheets: { "Naziv lista": [ {kolona: vrednost}, ... ] }
export function exportXlsx(filename, sheets) {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}
