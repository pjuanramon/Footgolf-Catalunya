const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: etapa3Res } = await supabase.from('resultados_etapas').select('*, jugador:jugadores(*)').eq('etapa_id', 3);
    console.log('--- ALL ETAPA 3 RESULTS ---');
    etapa3Res.forEach(r => {
        console.log(`- Nickname: ${r.jugador?.nickname || r.jugador_nickname}, Nombre: ${r.jugador?.nombre_completo}, Nombre Manual: ${r.nombre_manual}, Puntos: ${r.puntos}`);
    });
}

check().catch(console.error);
