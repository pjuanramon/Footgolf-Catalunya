require('dotenv').config();
const { supabase } = require('../lib/supabase') || require('./lib/supabase');

async function search() {
    const { data, error } = await supabase
        .from('jugadores')
        .select('id, nombre_completo, apodo')
        .order('nombre_completo');
        
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log('Total players:', data.length);
    const keywords = ['Luengo', 'Leiva', 'Pahisa', 'Perez', 'Pérez', 'Jordi', 'Abril', 'Santiago', 'Medina', 'Gustavo', 'Tellez', 'Téllez', 'Pizarro', 'Chechu', 'Moreno'];
    data.filter(p => keywords.some(k => (p.nombre_completo || '').toLowerCase().includes(k.toLowerCase()) || (p.apodo || '').toLowerCase().includes(k.toLowerCase())))
        .forEach(p => console.log(`${p.id}: ${p.nombre_completo} (apodo: ${p.apodo})`));
}

search().catch(console.error);
