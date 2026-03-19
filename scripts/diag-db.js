const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Diagnóstico de Base de Datos ---');
    
    // Check etapas
    const { data: etapas, count: totalEtapas, error: eError } = await supabase
        .from('etapas')
        .select('*', { count: 'exact' });

    if (eError) {
        console.error('Error etapas:', eError);
    } else {
        console.log(`Total Etapas: ${totalEtapas}`);
        console.log('Estados de las etapas:', etapas.map(e => `${e.nombre}: ${e.estado}`));
    }

    // Check jugadores
    const { count: totalJugadores } = await supabase
        .from('jugadores')
        .select('*', { count: 'exact', head: true });
    
    console.log(`Total Jugadores: ${totalJugadores}`);
    
    console.log('--- Fin del Diagnóstico ---');
}

check().catch(console.error);
