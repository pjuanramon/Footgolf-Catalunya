const XLSX = require('xlsx');
const workbook = XLSX.readFile('c:\\Dev\\Footgolf_Cat_Web\\Hits_Footgolf_2026-07-18_Formatted.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const json = XLSX.utils.sheet_to_json(sheet);
console.log(json[0]);
