const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function find() {
    const { data: player } = await supabase.from('jugadores').select('*').eq('id', '7735029f-ef93-4dbc-9a55-907651401567').single();
    console.log('Player P. Santoro:', player);
    
    const { data: etapa } = await supabase.from('etapas').select('*').eq('fecha', '2026-06-13').single();
    console.log('Etapa 5 ID:', etapa?.id);
}

find().catch(console.error);
