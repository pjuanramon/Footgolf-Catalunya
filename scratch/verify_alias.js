
const XLSX = require('xlsx');

const workbook = XLSX.readFile('Hits_Footgolf_2026-04-12_Aliased.xlsx');
const worksheet = workbook.Sheets['FOOTGOLFERS'];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Resultados de la transformación (primeras 10 filas):');
console.log(JSON.stringify(data.slice(0, 10).map(r => r.Footgolfer), null, 2));
