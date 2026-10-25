const { supabase } = require('../lib/supabase');

async function check() {
    // 1. Etapas
    const { data: etapas, error: eErr } = await supabase
        .from('etapas')
        .select('*');
    if (eErr) console.error('Error etapas:', eErr);
    console.log('--- ETAPAS ---');
    console.log(etapas);

    // 2. Find copa or match play etapa
    const copaEtapa = etapas ? etapas.filter(e => 
        (e.nombre && e.nombre.toLowerCase().includes('copa')) || 
        (e.nombre && e.nombre.toLowerCase().includes('match')) ||
        e.id === 100 ||
        e.tipo === 'copa'
    ) : [];
    console.log('--- COPA ETAPAS ---', copaEtapa);

    // 3. Inscripciones sample to see all columns
    const { data: inscSample, error: sErr } = await supabase
        .from('inscripciones')
        .select('*')
        .limit(5);
    console.log('--- INSC SAMPLE KEYS ---', inscSample && inscSample[0] ? Object.keys(inscSample[0]) : 'None');

    // 4. Inscripciones for copa / match play
    const etapaIds = copaEtapa.map(e => e.id);
    const { data: inscripciones, error: iErr } = await supabase
        .from('inscripciones')
        .select('*, jugadores(*)')
        .in('etapa_id', etapaIds.length > 0 ? etapaIds : [100]);
    
    console.log('--- INSCRIPCIONES MATCHPLAY ---');
    console.log(JSON.stringify(inscripciones, null, 2));
}

check().catch(console.error);
