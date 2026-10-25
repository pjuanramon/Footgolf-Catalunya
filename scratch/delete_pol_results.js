const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data, error } = await supabase
        .from('resultados_etapas')
        .delete()
        .eq('jugador_id', '7735029f-ef93-4dbc-9a55-907651401567');
        
    if (error) {
        console.error('Error deleting:', error);
    } else {
        console.log('Deleted successfully:', data);
    }
}
main().catch(console.error);
