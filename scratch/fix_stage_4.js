const { createClient } = require('@supabase/supabase-js');
const { calcularClasificacionGeneral } = require('../lib/ranking-engine');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
    const etapa_id = 4;
    console.log('Fetching all results from DB...');
    const { data: todosLosResultados, error } = await supabase
        .from('resultados_etapas')
        .select('*, jugadores(nickname)')
        .order('etapa_id', { ascending: true });

    if (error) {
        console.error('Error fetching results:', error);
        return;
    }

    console.log('Recalculating general with new logic...');
    const general = calcularClasificacionGeneral(todosLosResultados);

    const categoriasFinal = { 'Absoluta': [], 'Rookie': [], 'Senior 45 +': [], 'Senior 55 +': [], 'Damas': [], 'Junior': [] };
    Object.keys(categoriasFinal).forEach(cat => {
        const rankingCat = general.map(j => {
            const catData = j.categorias[cat] || { total: 0, etapas: [] };
            if (cat === 'Absoluta' && j.nickname === 'Jorge Santiago Buqueras') {
                console.log('DEBUG Jorge catData:', JSON.stringify(catData, null, 2));
            }
            return { 
                name: j.nickname, 
                total: catData.total, 
                pos: 0,
                ...catData
            };
        }).filter(j => j.total > 0).sort((a, b) => b.total - a.total);
        rankingCat.forEach((p, idx) => p.pos = idx + 1);
        categoriasFinal[cat] = rankingCat;
    });

    const finalJson = { 
        jornada: etapa_id, 
        ultima_actualizacion: new Date().toISOString(), 
        categorias: categoriasFinal 
    };

    console.log('Updating stage 4 JSON in DB...');
    const { error: updateError } = await supabase
        .from('etapas')
        .update({ archivo_excel: JSON.stringify(finalJson), estado: 'finalizada' })
        .eq('id', etapa_id);

    if (updateError) {
        console.error('Error updating stage:', updateError);
    } else {
        console.log('SUCCESS: Stage 4 data fixed in production DB.');
    }
}

fix();
