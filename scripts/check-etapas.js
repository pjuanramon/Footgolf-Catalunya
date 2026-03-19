const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('etapas').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('ETAPAS ENCONTRADAS:', data.length);
        data.forEach(e => console.log(`- ${e.nombre} (${e.fecha}) status: ${e.estado}`));
    }
}
check();
