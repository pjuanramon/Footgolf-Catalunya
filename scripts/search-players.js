const { supabase } = require('./lib/supabase');

const searchTerms = ['Giacomo', 'Jorge Buqueras', 'Marc Company', 'Alberto Leivas'];

async function search() {
    console.log('Searching for players...');
    for (const term of searchTerms) {
        const { data, error } = await supabase
            .from('jugadores')
            .select('id, nombre_completo, fecha_nacimiento, anio_licencia, categorias')
            .ilike('nombre_completo', `%${term}%`);
            
        if (error) {
            console.error(`Error searching for ${term}:`, error.message);
        } else {
            console.log(`Results for ${term}:`, JSON.stringify(data, null, 2));
        }
    }
}

search().catch(err => console.error(err));
