const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: etapas, error } = await supabase
        .from('etapas')
        .select('*')
        .order('id', { ascending: true });
        
    if (error) {
        console.error(error);
        return;
    }
    console.log('--- ETAPAS IN DB ---');
    etapas.forEach(e => {
        console.log(`ID: ${e.id} | Nombre: ${e.nombre} | Estado: ${e.estado} | Tipo: ${e.tipo}`);
    });
}
main().catch(console.error);
