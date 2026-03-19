const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Verificando Jugadores ---');
    const { data: jug } = await supabase.from('jugadores')
        .select('*')
        .eq('email', 'pjuanramon@hotmail.com');
    console.log('Jugador:', JSON.stringify(jug, null, 2));

    console.log('\n--- Últimas 5 Licencias ---');
    const { data: lics } = await supabase.from('licencias')
        .select('*, jugadores(nickname)')
        .order('id', { ascending: false })
        .limit(5);
    console.log(JSON.stringify(lics, null, 2));

    console.log('\n--- Últimas 5 Inscripciones ---');
    const { data: ins } = await supabase.from('inscripciones')
        .select('*, jugadores(nickname), etapas(nombre)')
        .order('id', { ascending: false })
        .limit(5);
    console.log(JSON.stringify(ins, null, 2));
}

check().catch(console.error);
