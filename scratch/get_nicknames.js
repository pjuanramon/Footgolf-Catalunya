const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: players, error } = await supabase
        .from('jugadores')
        .select('id, nombre_completo, nickname');
    
    if (error) {
        console.error(error);
        return;
    }
    
    console.log(JSON.stringify(players, null, 2));
}

main().catch(console.error);
