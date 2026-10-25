const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function search() {
    const { data: calderi } = await supabase.from('jugadores').select('*').ilike('nombre_completo', '%Calder%');
    console.log('Juan Calderi matches:', calderi);
}

search().catch(console.error);
