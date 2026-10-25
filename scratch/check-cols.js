const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase.from('resultados_etapas').select('*').limit(1);
    console.log('resultados_etapas structure:', data);
}

check().catch(console.error);
