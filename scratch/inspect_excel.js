
const XLSX = require('xlsx');

const workbook = XLSX.readFile('Hits_Footgolf_2026-04-12.xlsx');
const worksheet = workbook.Sheets['FOOTGOLFERS'];
const data = XLSX.utils.sheet_to_json(worksheet);

if (data.length > 0) {
    console.log('Columnas en FOOTGOLFERS:', Object.keys(data[0]));
    console.log('Primeras 3 filas:', JSON.stringify(data.slice(0, 3), null, 2));
} else {
    console.log('Hoja vacía o no tiene cabeceras.');
}
