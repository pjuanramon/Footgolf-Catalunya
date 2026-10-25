const XLSX = require('xlsx');
const path = require('path');

function inspectE3() {
    console.log("=== ETAPA 3 ===");
    const excelPath = path.join(__dirname, '../data/Jornadas/Tournament Report from 3a Jornada Liga Catalana generated -2026-03-16 09_42_56.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' });
    
    console.log(rows[0]);
    console.log(rows[1]);
}

function inspectE4() {
    console.log("=== Hits_Footgolf_2026-04-12.xlsx ===");
    const excelPath = path.join(__dirname, '../Hits_Footgolf_2026-04-12.xlsx');
    const workbook = XLSX.readFile(excelPath);
    console.log("Sheet names:", workbook.SheetNames);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' });
    
    for (let i = 0; i < 5; i++) {
        console.log(rows[i]);
    }
}
inspectE4();
