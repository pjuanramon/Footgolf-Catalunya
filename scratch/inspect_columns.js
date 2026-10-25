const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data, error } = await supabase
        .from('jugadores')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error(error);
        return;
    }
    
    console.log('Columns in jugadores:', Object.keys(data[0] || {}));
}

main().catch(console.error);
