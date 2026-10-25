const XLSX = require('xlsx');
const path = require('path');
const { matchPlayerToDb } = require('../lib/matching');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const excelPath = path.resolve(__dirname, '../Resultados_Torneos/Tournament Report from Etapas 7-12 Footgolf Catalunya generated -2026-07-20 10_21_22.xlsx');

async function main() {
    const { data: dbPlayers } = await supabase.from('jugadores').select('*');
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet);

    const r1 = rawRows.filter(r => parseInt(r.RONDA) === 1);
    console.log('--- ALL RONDA 1 ROWS ---');
    r1.forEach((r, idx) => {
        const name = r['FOOTGOLFER NICKNAME'] || r['FOOTGOLFER NOMBRE_COMPLETO'];
        const match = matchPlayerToDb(name, dbPlayers);
        console.log(`${idx + 1}. Nickname: "${r['FOOTGOLFER NICKNAME']}" | Name: "${r['FOOTGOLFER NOMBRE_COMPLETO']}" | Ronda Jugada: "${r['RONDA JUGADA']}" | Matched: ${!!match.player} | Has License: ${match.player?.tiene_licencia}`);
    });
}
main().catch(console.error);
