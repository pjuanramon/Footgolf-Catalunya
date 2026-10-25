const XLSX = require('xlsx');
const workbook = XLSX.readFile('c:\\Dev\\Footgolf_Cat_Web\\Hits_Footgolf_2026-07-18.xlsx');

console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    console.log(XLSX.utils.sheet_to_json(sheet));
});
