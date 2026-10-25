const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function search() {
    const { data: montesinos } = await supabase.from('jugadores').select('*').ilike('nombre_completo', '%Montesinos%');
    console.log('Joan Montesinos search matches:', montesinos);

    const { data: curbelo } = await supabase.from('jugadores').select('*').ilike('nombre_completo', '%Curbelo%');
    console.log('Juan Rodriguez Curbelo search matches:', curbelo);
}

search().catch(console.error);
