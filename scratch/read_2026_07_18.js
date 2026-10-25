const XLSX = require('xlsx');
const workbook = XLSX.readFile('Hits_Footgolf_2026-07-18.xlsx');
const worksheet = workbook.Sheets['FOOTGOLFERS'];
const data = XLSX.utils.sheet_to_json(worksheet);
console.log(JSON.stringify(data, null, 2));
