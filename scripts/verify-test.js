const xlsx = require('xlsx');
const workbook = xlsx.readFile('TEST_Hits_Simulado_2026-04-12.xlsx');
console.log('--- Resumen Excel Generado ---');
workbook.SheetNames.forEach(name => {
    const sheet = workbook.Sheets[name];
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log(`Pestaña ${name}: ${data.length} filas.`);
    if (data.length > 0) {
        console.log(`Ejemplo Fila 1 en ${name}:`, JSON.stringify(data[0], null, 2));
    }
});
