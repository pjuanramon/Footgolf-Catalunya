const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.resolve(__dirname, '../Resultados_Torneos/Tournament Report from 5a etapa Liga Catalana generated -2026-06-16 12_48_13.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' }).slice(1);

const sorted = rows
  .map(r => ({ name: r['D'], score: Number(r['Y']) }))
  .filter(r => r.name)
  .sort((a,b) => a.score - b.score);

console.log(sorted);
