const { supabase } = require('../lib/supabase');

async function check() {
    if (!supabase) return;
    
    const { data, error } = await supabase
        .from('jugadores')
        .select('nombre_completo, nickname, tiene_licencia')
        .eq('tiene_licencia', true);

    if (error) {
        console.error(error);
        return;
    }

    console.log('Jugadores con licencia:', JSON.stringify(data, null, 2));
}

check();
