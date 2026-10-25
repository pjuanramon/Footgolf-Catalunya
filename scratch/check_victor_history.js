const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data } = await supabase
        .from('resultados_etapas')
        .select('*, etapas(nombre)')
        .eq('jugador_id', '30e5d409-5804-4a5c-936e-7eb1b09e27a3');
    console.log(data);
}
main().catch(console.error);
