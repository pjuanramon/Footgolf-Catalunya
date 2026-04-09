const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuery() {
    try {
        const etapa_id = 4;
        console.log('Testing query for etapa_id:', etapa_id);
        
        const { data, error } = await supabase
            .from('inscripciones')
            .select('*, jugadores(nickname, tiene_licencia, email)')
            .eq('etapa_id', etapa_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Success! Data count:', data.length);
            console.log('First record sample:', data[0]);
        }
    } catch (e) {
        console.error('Execution Error:', e);
    }
}

testQuery();
