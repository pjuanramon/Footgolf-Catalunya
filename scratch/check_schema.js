const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
    try {
        const { data, error } = await supabase
            .from('inscripciones')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Sample data keys:', Object.keys(data[0] || {}));
        }
    } catch (e) {
        console.error('Execution Error:', e);
    }
}

checkColumns();
