const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkInconsistencies() {
    try {
        const { data, error } = await supabase
            .from('jugadores')
            .select('nickname, nombre_completo, tiene_licencia')
            .eq('tiene_licencia', true)
            .limit(20);

        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Sample licensed players:');
            data.forEach(p => {
                console.log(`- Nickname: "${p.nickname}" | Name: "${p.nombre_completo}"`);
            });
        }
    } catch (e) {
        console.error('Execution Error:', e);
    }
}

checkInconsistencies();
