const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: results, error } = await supabase
        .from('resultados_etapas')
        .select('*, jugadores(nickname)')
        .eq('etapa_id', 7)
        .eq('jugador_id', 'c496ece7-e3b2-4a1b-ac10-e3c44862bc7d')
        .single();
        
    if (error) {
        console.error(error);
        return;
    }
    console.log(results);
}
main().catch(console.error);
