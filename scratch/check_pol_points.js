const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data } = await supabase
        .from('resultados_etapas')
        .select('*, etapas(nombre)')
        .eq('jugador_id', '7735029f-ef93-4dbc-9a55-907651401567');
    console.log(data);
}
main().catch(console.error);
