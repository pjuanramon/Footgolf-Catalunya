const xlsx = require('xlsx');
const workbook = xlsx.readFile('c:\\Dev\\Footgolf_Cat_Web\\Hits_Footgolf_2026-08-01.xlsx');

console.log('=== HITS SHEET ===');
console.log(xlsx.utils.sheet_to_json(workbook.Sheets['HITS']));

console.log('\n=== FOOTGOLFERS SHEET ===');
console.log(xlsx.utils.sheet_to_json(workbook.Sheets['FOOTGOLFERS']));
