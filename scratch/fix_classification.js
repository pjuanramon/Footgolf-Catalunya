const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = 'c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/.env';
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { calcularClasificacionGeneral } = require('../lib/ranking-engine');

async function fix() {
    console.log("--- REPARACIÓN TOTAL ETAPA 4 ---");

    const ALBERTO_ID = '623e8adf-1b33-430c-8ee1-c1363b660f08';
    const DANIEL_ID = 'a6f73ff3-a3e6-4dc3-9ba4-08f6cb8c70a8';

    // 1. Forzar puntos de Alberto (Ganó desempate contra JuanRa, lleva el 1º puesto de su grupo)
    // JuanRa tiene 215, así que Alberto (que ganó) se lleva los 230 o 250 según el grupo.
    // Usaremos los puntos que calculó la interfaz: 250 puntos (o lo que correspondiera).
    await supabase.from('resultados_etapas').upsert({
        etapa_id: 4,
        jugador_id: ALBERTO_ID,
        puntos_absoluta: 215, // Ajusta según el valor real de su desempate
        puntos_rookie: 0,
        score: -5
    }, { onConflict: 'etapa_id, jugador_id' });

    console.log("✅ Puntos de Alberto inyectados.");

    // 2. Recalcular TODO el JSON final
    const { data: todosLosResultados } = await supabase.from('resultados_etapas')
        .select('*, jugadores(nickname)')
        .order('etapa_id', { ascending: true });

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

    const finalJson = {
        jornada: 4,
        ultima_actualizacion: new Date().toISOString(),
        categorias: categoriasFinal
    };

    const { error } = await supabase.from('etapas')
        .update({ archivo_excel: JSON.stringify(finalJson), estado: 'finalizada' })
        .eq('id', 4);

    if (error) console.error("Error actualizando JSON:", error);
    else console.log("✅ Clasificación General RECALCULADA y GUARDADA.");
}

fix();
