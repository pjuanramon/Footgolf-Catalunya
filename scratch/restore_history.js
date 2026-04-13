const { createClient } = require('@supabase/supabase-js');
const { matchPlayerToDb } = require('../lib/matching');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function restore() {
    console.log('--- Iniciando restauración de historial v4 (con nombres legacy) ---');
    
    const { data: dbPlayers } = await supabase.from('jugadores').select('*');
    const { data: etapas } = await supabase.from('etapas').select('id, nombre, archivo_excel').in('id', [1, 2, 3]);

    for (const etapa of etapas) {
        if (!etapa.archivo_excel) continue;
        const json = JSON.parse(etapa.archivo_excel);
        const combinedResults = new Map();

        for (const cat of Object.keys(json.categorias)) {
            for (const p of json.categorias[cat]) {
                if (!combinedResults.has(p.name)) {
                    combinedResults.set(p.name, { puntos_absoluta: 0, puntos_rookie: 0, puntos_senior45: 0, puntos_senior55: 0, puntos_femenino: 0 });
                }
                const res = combinedResults.get(p.name);
                if (cat === 'Absoluta') res.puntos_absoluta = p.total || 0;
                if (cat === 'Rookie') res.puntos_rookie = p.total || 0;
                if (cat === 'Senior 45 +') res.puntos_senior45 = p.total || 0;
                if (cat === 'Senior 55 +') res.puntos_senior55 = p.total || 0;
                if (cat === 'Damas' || cat === 'Femenino') res.puntos_femenino = p.total || 0;
            }
        }

        console.log(`Insertando ${combinedResults.size} resultados para Etapa ${etapa.id}...`);
        for (const [name, p] of combinedResults.entries()) {
            const match = matchPlayerToDb(name, dbPlayers);
            if (match.player) {
                await supabase.from('resultados_etapas').upsert({
                    etapa_id: etapa.id,
                    jugador_id: match.player.id,
                    ...p,
                    score: 0
                }, { onConflict: 'etapa_id, jugador_id' });
            }
        }
    }

    console.log('--- Redireccionando a Fix Stage 4 ---');
    require('./fix_stage_4');
}

restore();
