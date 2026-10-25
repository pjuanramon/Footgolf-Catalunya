const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    const { data, error } = await supabase
        .from('resultados_etapas')
        .select('*')
        .limit(1);
        
    if (error) {
        console.error('Error fetching columns:', error);
    } else {
        console.log('Sample row data keys:', data.length > 0 ? Object.keys(data[0]) : 'No data in table');
    }
}
checkSchema();
