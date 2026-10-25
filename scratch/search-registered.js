const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function search() {
    const { data: allPlayers } = await supabase.from('jugadores').select('*');
    const matches = allPlayers.filter(p => 
        (p.nombre_completo && p.nombre_completo.toLowerCase().includes('calder')) || 
        (p.nickname && p.nickname.toLowerCase().includes('calder'))
    );
    console.log('Players with "calder":', matches);

    const matchesJuan = allPlayers.filter(p => 
        (p.nombre_completo && p.nombre_completo.toLowerCase().includes('juan')) || 
        (p.nickname && p.nickname.toLowerCase().includes('juan'))
    );
    console.log('Players with "juan":', matchesJuan.map(j => ({ id: j.id, nickname: j.nickname, nombre: j.nombre_completo })));
}

search().catch(console.error);
