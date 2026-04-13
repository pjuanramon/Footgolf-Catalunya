const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'resultados_etapas' });
    // If RPC doesn't exist, we can try to select one row and see keys
    if (error) {
        const { data: row } = await supabase.from('resultados_etapas').select('*').limit(1);
        if (row && row.length > 0) {
            console.log('Columns:', Object.keys(row[0]));
        } else {
            // Try to insert a dummy and see error for columns if possible, 
            // or just guess based on existing code.
            // Actually, existing code uses puntos_femenino.
            console.log('No rows found to guess columns.');
        }
    } else {
        console.log('Columns:', data);
    }
}

checkColumns();
