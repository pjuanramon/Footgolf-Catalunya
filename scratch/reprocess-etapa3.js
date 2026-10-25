const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const { matchPlayerToDb } = require('../lib/matching');
const { calcularPuntosEtapa, calcularClasificacionGeneral } = require('../lib/ranking-engine');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const etapaId = 3;
    console.log(`--- Reprocessing Etapa ${etapaId} ---`);

    // 1. Fetch data
    const { data: etapa } = await supabase.from('etapas').select('*').eq('id', etapaId).single();
    const { data: dbPlayers } = await supabase.from('jugadores').select('*');
    
    // 2. Read Excel
    const excelPath = path.resolve(__dirname, '../Resultados_Torneos/Tournament Report from 3a Jornada Liga Catalana generated -2026-05-31 05_11_53.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' }).slice(1);

    console.log(`Read ${rows.length} rows from Excel.`);

    const resultadosBrutos = [];
    const logs = [];

    // 3. Match players
    for (const row of rows) {
        const rawName = String(row['D'] || '').trim();
        if (!rawName) continue;

        const isSalazar = rawName.toLowerCase().includes('salazar');
        const isAbril = rawName.toLowerCase().includes('abril');

        let p = matchPlayerToDb(rawName, dbPlayers || []).player;

        // FORZADO DE ID PARA EVITAR FALLOS DE MATCHING
        if (isSalazar) {
            p = dbPlayers.find(x => x.id === '623e8adf-1b33-430c-8ee1-c1363b660f08') || p;
        }
        if (isAbril) {
            p = dbPlayers.find(x => x.id === 'a6f73ff3-a3e6-4dc3-9ba4-08f6cb8c70a8') || p;
        }

        let tieneLicenciaValida = false;
        if (p) {
            tieneLicenciaValida = p.tiene_licencia;
            if (isSalazar || isAbril) tieneLicenciaValida = true;
        } else {
            tieneLicenciaValida = String(row['F']).trim().toUpperCase() !== 'NO';
        }

        if (!tieneLicenciaValida) {
            logs.push(`Ignorado (Sin Licencia): ${rawName}`);
            continue;
        }

        resultadosBrutos.push({
            rawName,
            score: Number(row['Y'] || 0),
            wonTie: false, // Default false unless desempates are specified
            dbPlayer: p
        });
    }

    console.log(`Matched players with license: ${resultadosBrutos.filter(r => r.dbPlayer).length}`);
    
    // 4. Calculate points
    const puntosEtapa = calcularPuntosEtapa(resultadosBrutos);
    console.log(`Calculated points for ${puntosEtapa.length} players.`);

    // Check if David Cortés is in the calculated points
    const cortesPoints = puntosEtapa.find(p => p.nickname === 'D. Cortés' || (p.dbPlayer && p.dbPlayer.id === '07af4157-5da3-4f6d-8a7c-524e14fb58eb'));
    console.log('David Cortés calculated points:', cortesPoints);

    // 5. Commit to database
    console.log('Inserting/Upserting results...');
    for (const r of puntosEtapa) {
        if (!r.jugador_id) {
            console.warn(`Skipping player ${r.nickname} because they have no DB player ID.`);
            continue;
        }
        const { error } = await supabase.from('resultados_etapas').upsert({
            etapa_id: etapaId, 
            jugador_id: String(r.jugador_id),
            puntos_absoluta: r.puntos['Absoluta'] || 0, 
            puntos_rookie: r.puntos['Rookie'] || 0,
            puntos_senior45: r.puntos['Senior 45 +'] || 0, 
            puntos_senior55: r.puntos['Senior 55 +'] || 0,
            puntos_femenino: r.puntos['Damas'] || 0, 
            score: Math.round(Number(r.score))
        }, { onConflict: 'etapa_id, jugador_id' });
        if (error) {
            console.error(`Error upserting ${r.nickname}:`, error.message);
        }
    }

    // 6. Update general rankings in etapas
    console.log('Updating overall classification...');
    const { data: todosLosResultados, error: fetchAllErr } = await supabase
        .from('resultados_etapas')
        .select('*, jugadores(nickname)')
        .order('etapa_id', { ascending: true });

    if (fetchAllErr) throw fetchAllErr;

    const general = calcularClasificacionGeneral(todosLosResultados);
    const categoriasFinal = { 'Absoluta': [], 'Rookie': [], 'Senior 45 +': [], 'Senior 55 +': [], 'Damas': [], 'Junior': [] };
    
    Object.keys(categoriasFinal).forEach(cat => {
        const rankingCat = general.map(j => {
            const catData = j.categorias[cat] || { total: 0, etapas: [] };
            return { name: j.nickname, total: catData.total, pos: 0, ...catData };
        }).filter(j => j.total > 0).sort((a, b) => b.total - a.total);
        rankingCat.forEach((p, idx) => p.pos = idx + 1);
        categoriasFinal[cat] = rankingCat;
    });

    const finalJson = { jornada: etapaId, ultima_actualizacion: new Date().toISOString(), categorias: categoriasFinal };
    
    const { error: updateEtapaErr } = await supabase
        .from('etapas')
        .update({ archivo_excel: JSON.stringify(finalJson), estado: 'finalizada' })
        .eq('id', etapaId);

    if (updateEtapaErr) throw updateEtapaErr;
    console.log('Overall ranking updated in stages table.');
    console.log('Reprocessing completed.');
}

main().catch(err => {
    console.error('Error reprocessing:', err);
    process.exit(1);
});
