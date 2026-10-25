const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findIds() {
    const { data: players } = await supabase.from('jugadores').select('id, nickname, nombre_completo');
    const names = ['Jorge Santiago Buqueras', 'Eduardo Martin Rodriguez', 'Daniel Abril Amador', 'Sergi Pahisa'];
    players.forEach(p => {
        if (names.some(n => p.nombre_completo.toLowerCase().includes(n.toLowerCase()) || p.nickname.toLowerCase().includes(n.toLowerCase()))) {
            console.log(`Match: ${p.nickname} / ${p.nombre_completo} -> ID: ${p.id}`);
        }
    });
}
findIds().catch(console.error);
