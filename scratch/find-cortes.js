const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function find() {
    const playerId = '07af4157-5da3-4f6d-8a7c-524e14fb58eb';
    
    const { data: inscripciones } = await supabase.from('inscripciones').select('*').eq('jugador_id', playerId);
    console.log('Inscripciones for D. Cortés:', inscripciones);

    const { data: licencias } = await supabase.from('licencias').select('*').eq('jugador_id', playerId);
    console.log('Licencias for D. Cortés:', licencias);
}

find().catch(console.error);
