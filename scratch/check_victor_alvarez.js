const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.resolve(__dirname, '../Resultados_Torneos/Tournament Report from Etapas 7-12 Footgolf Catalunya generated -2026-07-20 10_21_22.xlsx');

function main() {
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet);

    console.log('Searching for "Alvarez" in all rows...');
    const matches = rawRows.filter(r => {
        const nick = String(r['FOOTGOLFER NICKNAME'] || '');
        const name = String(r['FOOTGOLFER NOMBRE_COMPLETO'] || '');
        return nick.toLowerCase().includes('alvarez') || name.toLowerCase().includes('alvarez');
    });

    matches.forEach(m => {
        console.log(`Ronda: ${m.RONDA} | Nickname: ${m['FOOTGOLFER NICKNAME']} | Nombre: ${m['FOOTGOLFER NOMBRE_COMPLETO']} | Ronda Jugada: ${m['RONDA JUGADA']} | TPAR: ${m.TPAR}`);
    });
}
main();
