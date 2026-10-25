const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.resolve(__dirname, '../Resultados_Torneos/Tournament Report from 3a Jornada Liga Catalana generated -2026-05-31 05_11_53.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' });

rows.forEach((row, idx) => {
    const name = String(row['D'] || '');
    if (name.includes('Linares') || name.includes('Martínez')) {
        console.log(`Row ${idx}:`, row);
    }
});
