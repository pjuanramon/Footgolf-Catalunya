const { createClient } = require('@supabase/supabase-js');
// require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('resultados_etapas').select('*').limit(1);
    if (error) {
        console.log('Error or Table missing:', error.message);
    } else {
        console.log('Table exists. Rows found:', data.length);
    }
}

check();
