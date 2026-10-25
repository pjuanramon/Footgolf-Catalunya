const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    console.log('--- DB Verification ---');
    const { data: etapa } = await supabase.from('etapas').select('*').eq('id', 5).single();
    console.log('Etapa 5 status:', etapa.estado); // Should be closed
    
    const { data: david } = await supabase.from('jugadores').select('*').eq('id', '9b8d01e2-eb30-4902-8d03-d469f4d14fb6').single();
    console.log('David Rojo name & license:', david.nombre_completo, david.tiene_licencia, david.anio_licencia);
    
    const { data: pol } = await supabase.from('jugadores').select('*').eq('id', '7735029f-ef93-4dbc-9a55-907651401567').single();
    console.log('Pol Santoro name, nickname & license:', pol.nombre_completo, pol.nickname, pol.tiene_licencia, pol.anio_licencia);

    const { data: polLic } = await supabase.from('licencias').select('*').eq('jugador_id', '7735029f-ef93-4dbc-9a55-907651401567').single();
    console.log('Pol Santoro license record:', polLic ? { anio: polLic.anio, estado: polLic.estado } : 'None');

    const { data: insDavid } = await supabase.from('inscripciones').select('*').eq('jugador_id', '9b8d01e2-eb30-4902-8d03-d469f4d14fb6').eq('etapa_id', 5).single();
    console.log('David Rojo registration status:', insDavid ? insDavid.estado : 'None');
}

verify().catch(console.error);
