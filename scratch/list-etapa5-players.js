const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: inscritos } = await supabase
        .from('inscripciones')
        .select('*, jugador:jugadores(*)')
        .eq('etapa_id', 5)
        .eq('estado', 'pagada');
        
    console.log('Total inscritos:', inscritos.length);
    inscritos.forEach((i, idx) => {
        console.log(`${idx + 1}. Nickname: ${i.jugador?.nickname}, Name: ${i.jugador?.nombre_completo}`);
    });
}

check().catch(console.error);
