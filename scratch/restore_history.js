const { createClient } = require('@supabase/supabase-js');
const { matchPlayerToDb } = require('../lib/matching');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function restore() {
    console.log('--- Iniciando restauración de historial v5 (corrección de puntos inflados) ---');
    
    // 1. Limpiar datos viejos de las etapas 1, 2, 3 para evitar duplicados/inflados
    console.log('Limpiando datos previos de etapas 1, 2, 3...');
    await supabase.from('resultados_etapas').delete().in('etapa_id', [1, 2, 3]);

    const { data: dbPlayers } = await supabase.from('jugadores').select('*');
    const { data: etapas } = await supabase.from('etapas').select('id, nombre, archivo_excel').in('id', [1, 2, 3]);

    for (const etapa of etapas) {
        if (!etapa.archivo_excel) continue;
        const json = JSON.parse(etapa.archivo_excel);
        const combinedResults = new Map();

        const stageKey = `e${etapa.id}`; // e1, e2, or e3

        for (const cat of Object.keys(json.categorias)) {
            for (const p of json.categorias[cat]) {
                if (!combinedResults.has(p.name)) {
                    combinedResults.set(p.name, { puntos_absoluta: 0, puntos_rookie: 0, puntos_senior45: 0, puntos_senior55: 0, puntos_femenino: 0 });
                }
                const res = combinedResults.get(p.name);
                
                // IMPORTANTE: Obtenemos los puntos de esa etapa concreta (e.g., p.e2), 
                // NO el total acumulado (p.total).
                const pts = p[stageKey] || 0;

                if (cat === 'Absoluta') res.puntos_absoluta = pts;
                if (cat === 'Rookie') res.puntos_rookie = pts;
                if (cat === 'Senior 45 +') res.puntos_senior45 = pts;
                if (cat === 'Senior 55 +') res.puntos_senior55 = pts;
                if (cat === 'Damas' || cat === 'Femenino') res.puntos_femenino = pts;
            }
        }

        console.log(`Insertando ${combinedResults.size} resultados reales para Etapa ${etapa.id}...`);
        for (const [name, p] of combinedResults.entries()) {
            const match = matchPlayerToDb(name, dbPlayers);
            if (match.player) {
                await supabase.from('resultados_etapas').upsert({
                    etapa_id: etapa.id,
                    jugador_id: match.player.id,
                    ...p,
                    score: 0
                });
            }
        }
    }

    console.log('--- Redireccionando a Fix Stage 4 ---');
    require('./fix_stage_4');
}

restore();
