const XLSX = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { matchPlayerToDb } = require('../lib/matching');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const excelPath = path.resolve(__dirname, '../Resultados_Torneos/Tournament Report from 6a etapa Liga Catalana generated -2026-07-07 12_26_48.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' });

    const { data: dbPlayers } = await supabase.from('jugadores').select('*');

    console.log('--- ALL EXCEL ROWS IN J6 ---');
    rows.forEach((row, idx) => {
        if (idx === 0) return; // Header
        const rawName = String(row['D'] || '').trim();
        const nickname = String(row['B'] || '').trim();
        const played = String(row['F'] || '').trim().toUpperCase();
        const score = row['Y'];
        
        if (!rawName) return;

        const match = matchPlayerToDb(rawName, dbPlayers || []);
        const p = match.player;
        
        console.log(`Row ${idx}: Name="${rawName}" (Nick="${nickname}"), Played="${played}", Score="${score}"`);
        if (p) {
            console.log(`  -> Matched in DB as: ${p.nickname} (ID: ${p.id}), tiene_licencia: ${p.tiene_licencia}`);
        } else {
            console.log(`  -> NO MATCH IN DATABASE`);
        }
    });
}

main().catch(console.error);
