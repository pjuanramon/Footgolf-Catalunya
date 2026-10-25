const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../public/docs/Ranking Catalán 2026.xlsx');
const wb = XLSX.readFile(excelPath);

console.log("=== Etapa 3 Absoluta ===");
const sheetE3 = wb.Sheets['Etapa 3 Absoluta'];
const rowsE3 = XLSX.utils.sheet_to_json(sheetE3, { header: 'A', defval: '' }).slice(1);
rowsE3.forEach(row => {
    if (row['C'] || row['E']) {
        console.log(`- ${row['C']} / ${row['E']} (Score: ${row['F']}, Pts: ${row['G']})`);
    }
});

console.log("\n=== Etapa 4 Absoluta ===");
const sheetE4 = wb.Sheets['Etapa 4 Absoluta'];
const rowsE4 = XLSX.utils.sheet_to_json(sheetE4, { header: 'A', defval: '' }).slice(1);
rowsE4.forEach(row => {
    if (row['C'] || row['E']) {
        console.log(`- ${row['C']} / ${row['E']} (Score: ${row['F']}, Pts: ${row['G']})`);
    }
});
