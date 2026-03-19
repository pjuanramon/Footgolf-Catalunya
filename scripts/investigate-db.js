const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function investigate() {
    console.log('--- Investigando Jugadores ---');
    
    // 1. Buscar al usuario que escribió (probablemente pjuanramon@hotmail.com o similar)
    const { data: usuario, error: uErr } = await supabase
        .from('jugadores')
        .select('*')
        .or('email.eq.pjuanramon@hotmail.com,nickname.ilike.%juanra%');
    
    console.log('Posibles registros del usuario:', usuario);

    // 2. Buscar al jugador sospechoso
    const { data: sospechoso, error: sErr } = await supabase
        .from('jugadores')
        .select('*')
        .eq('email', 'jacmeinbc@gmail.com');
    
    console.log('Jugador sospechoso (jacmeinbc@gmail.com):', sospechoso);

    // 3. Ver estructura de licencias
    const { data: licCols, error: lErr } = await supabase
        .from('licencias')
        .select('*')
        .limit(1);
    
    if (licCols && licCols.length > 0) {
        console.log('Estructura tabla licencias (ejemplo):', Object.keys(licCols[0]));
    } else {
        console.log('Tabla licencias vacía o error.');
    }
}

investigate();
