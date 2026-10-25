const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.resolve(__dirname, '../Resultados_Torneos/Tournament Report from 5a etapa Liga Catalana generated -2026-06-16 12_48_13.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' });

rows.forEach((row, idx) => {
    const name = String(row['D'] || '');
    if (name.includes('Abril') || name.includes('luengo') || idx < 5) {
        console.log(`Row ${idx}:`, row);
    }
});
