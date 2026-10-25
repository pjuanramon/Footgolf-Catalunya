const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listAll() {
    const { data: players } = await supabase.from('jugadores').select('id, nickname, nombre_completo');
    console.log('Total players:', players.length);
    players.forEach(p => {
        console.log(`- ${p.nickname} (${p.nombre_completo})`);
    });
}

listAll().catch(console.error);
