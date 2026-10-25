const { createClient } = require('@supabase/supabase-js');
const { matchPlayerToDb } = require('../lib/matching');
const XLSX = require('xlsx');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testMatching() {
    const { data: dbPlayers } = await supabase.from('jugadores').select('*');
    console.log(`Loaded ${dbPlayers.length} players from DB.`);

    const excelPathE3 = path.join(__dirname, '../data/Jornadas/Tournament Report from 3a Jornada Liga Catalana generated -2026-03-16 09_42_56.xlsx');
    const wbE3 = XLSX.readFile(excelPathE3);
    const rowsE3 = XLSX.utils.sheet_to_json(wbE3.Sheets[wbE3.SheetNames[0]], { header: 'A', defval: '' }).slice(1);
    
    console.log("=== UNMATCHED IN E3 ===");
    for (const row of rowsE3) {
        const rawName = String(row['D'] || '').trim();
        if (!rawName) continue;
        if (String(row['F']).trim().toUpperCase() === 'NO') continue;
        
        const match = matchPlayerToDb(rawName, dbPlayers);
        if (!match.player) {
            console.log(`Unmatched E3: ${rawName}`);
        }
    }

    const excelPathE4 = path.join(__dirname, '../Resultados_Torneos/Tournament Report from 4a Jornada Liga Catalana generated -2026-05-31 05_11_33.xlsx');
    const wbE4 = XLSX.readFile(excelPathE4);
    const rowsE4 = XLSX.utils.sheet_to_json(wbE4.Sheets[wbE4.SheetNames[0]], { header: 'A', defval: '' }).slice(1);
    
    console.log("=== UNMATCHED IN E4 ===");
    for (const row of rowsE4) {
        const rawName = String(row['D'] || '').trim();
        if (!rawName) continue;
        if (String(row['F']).trim().toUpperCase() === 'NO') continue;
        
        const match = matchPlayerToDb(rawName, dbPlayers);
        if (!match.player) {
            console.log(`Unmatched E4: ${rawName}`);
        }
    }
}
testMatching().catch(console.error);
