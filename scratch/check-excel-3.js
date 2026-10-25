const XLSX = require('xlsx');
const path = require('path');

async function main() {
    const excelPath = path.resolve(__dirname, '../Resultados_Torneos/Tournament Report from 3a Jornada Liga Catalana generated -2026-05-31 05_11_53.xlsx');
    console.log('Reading Excel:', excelPath);
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' });
    
    console.log('Total rows:', rows.length);
    // Print first 5 rows to see structure
    console.log('Headers/First rows:', rows.slice(0, 5));
    
    // Look for any row that might match Cortés or Cortes
    rows.forEach((row, idx) => {
        const name = String(row['D'] || '');
        if (name.toLowerCase().includes('cort') || name.toLowerCase().includes('david')) {
            console.log(`Row ${idx}:`, row);
        }
    });
}

main().catch(console.error);
