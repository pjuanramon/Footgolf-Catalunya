const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    console.log('--- ETAPA 3 ---');
    const { data: e3 } = await supabase
        .from('resultados_etapas')
        .select('*, jugadores(nickname, nombre_completo)')
        .eq('etapa_id', 3)
        .order('score', { ascending: true });
    
    e3.forEach(r => {
        console.log(`- ${r.jugadores.nickname} (${r.jugadores.nombre_completo}): score ${r.score}, absoluta: ${r.puntos_absoluta}, rookie: ${r.puntos_rookie}`);
    });

    console.log('--- ETAPA 4 ---');
    const { data: e4 } = await supabase
        .from('resultados_etapas')
        .select('*, jugadores(nickname, nombre_completo)')
        .eq('etapa_id', 4)
        .order('score', { ascending: true });
    
    e4.forEach(r => {
        console.log(`- ${r.jugadores.nickname} (${r.jugadores.nombre_completo}): score ${r.score}, absoluta: ${r.puntos_absoluta}, rookie: ${r.puntos_rookie}`);
    });
}

inspect().catch(console.error);
