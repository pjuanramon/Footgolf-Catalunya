const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.resolve(__dirname, '../Resultados_Torneos/Tournament Report from Etapas 7-12 Footgolf Catalunya generated -2026-07-20 10_21_22.xlsx');

function main() {
    console.log('Reading:', excelPath);
    const workbook = XLSX.readFile(excelPath);
    console.log('Sheets in workbook:', workbook.SheetNames);
    
    // Inspect the first sheet or whatever sheet is there
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        console.log(`Sheet "${sheetName}": ref=${sheet['!ref']}, columns=${range.e.c + 1}, rows=${range.e.r + 1}`);
        
        // Print first 5 rows of each sheet
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log('First 5 rows:');
        rows.slice(0, 10).forEach((row, idx) => {
            console.log(`  Row ${idx + 1}:`, row);
        });
        console.log('----------------------------------------');
    });
}
main();
