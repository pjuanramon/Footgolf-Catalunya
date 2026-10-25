const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('--- Database updates for Cortés, Montesinos, and Curbelo ---');

    // 1. David Cortés Segura License updates
    const cortesId = '07af4157-5da3-4f6d-8a7c-524e14fb58eb';
    const { error: updateCortesErr } = await supabase
        .from('jugadores')
        .update({
            nombre_completo: 'David Cortés Segura',
            tiene_licencia: true,
            anio_licencia: 2026
        })
        .eq('id', cortesId);
    if (updateCortesErr) throw updateCortesErr;
    console.log('David Cortés player record updated.');

    // Add license for David Cortés if not exists
    const { data: existingCortesLic } = await supabase
        .from('licencias')
        .select('*')
        .eq('jugador_id', cortesId)
        .eq('anio', 2026)
        .maybeSingle();

    if (!existingCortesLic) {
        const { error: insertLicErr } = await supabase
            .from('licencias')
            .insert({
                jugador_id: cortesId,
                anio: 2026,
                fecha_compra: new Date().toISOString(),
                estado: 'pagada',
                jugador_nombre: 'David Cortés Segura',
                jugador_nickname: 'D. Cortés'
            });
        if (insertLicErr) throw insertLicErr;
        console.log('License created for David Cortés.');
    }

    // 2. Joan Montesinos (With License, Registered for Etapa 5)
    const joanEmail = 'joan.montesinos@example.com';
    let joanId;
    const { data: existingJoan } = await supabase.from('jugadores').select('*').eq('email', joanEmail).maybeSingle();
    
    if (existingJoan) {
        joanId = existingJoan.id;
        console.log('Joan Montesinos already exists in DB.');
    } else {
        const { data: newJoan, error: joanErr } = await supabase
            .from('jugadores')
            .insert({
                nombre_completo: 'Joan Montesinos',
                nickname: 'Joan Montesinos',
                nickname_normalizado: 'joan montesinos',
                email: joanEmail,
                tiene_licencia: true,
                anio_licencia: 2026,
                es_rookie: true,
                categorias_calculadas: ['Absoluta', 'Rookie']
            })
            .select()
            .single();
        if (joanErr) throw joanErr;
        joanId = newJoan.id;
        console.log('Joan Montesinos created in jugadores table.');
    }

    // License for Joan Montesinos
    const { data: existingJoanLic } = await supabase.from('licencias').select('*').eq('jugador_id', joanId).eq('anio', 2026).maybeSingle();
    if (!existingJoanLic) {
        const { error: joanLicErr } = await supabase.from('licencias').insert({
            jugador_id: joanId,
            anio: 2026,
            fecha_compra: new Date().toISOString(),
            estado: 'pagada',
            jugador_nombre: 'Joan Montesinos',
            jugador_nickname: 'Joan Montesinos'
        });
        if (joanLicErr) throw joanLicErr;
        console.log('License created for Joan Montesinos.');
    }

    // Registration for Joan Montesinos
    const { data: existingJoanIns } = await supabase.from('inscripciones').select('*').eq('jugador_id', joanId).eq('etapa_id', 5).maybeSingle();
    if (!existingJoanIns) {
        const { error: joanInsErr } = await supabase.from('inscripciones').insert({
            jugador_id: joanId,
            etapa_id: 5,
            estado: 'pagada',
            fecha_inscripcion: new Date().toISOString()
        });
        if (joanInsErr) throw joanInsErr;
        console.log('Joan Montesinos registered for Etapa 5.');
    }

    // 3. Juan Rodriguez Curbelo (Without License, Registered for Etapa 5)
    const curbeloEmail = 'juan.rodriguez.curbelo@example.com';
    let curbeloId;
    const { data: existingCurbelo } = await supabase.from('jugadores').select('*').eq('email', curbeloEmail).maybeSingle();
    
    if (existingCurbelo) {
        curbeloId = existingCurbelo.id;
        console.log('Juan Rodriguez Curbelo already exists in DB.');
    } else {
        const { data: newCurbelo, error: curbeloErr } = await supabase
            .from('jugadores')
            .insert({
                nombre_completo: 'Juan Rodriguez Curbelo',
                nickname: 'Juan Rodriguez Curbelo',
                nickname_normalizado: 'juan rodriguez curbelo',
                email: curbeloEmail,
                tiene_licencia: false,
                anio_licencia: null,
                es_rookie: true,
                categorias_calculadas: ['Absoluta', 'Rookie']
            })
            .select()
            .single();
        if (curbeloErr) throw curbeloErr;
        curbeloId = newCurbelo.id;
        console.log('Juan Rodriguez Curbelo created in jugadores table.');
    }

    // Registration for Juan Rodriguez Curbelo
    const { data: existingCurbeloIns } = await supabase.from('inscripciones').select('*').eq('jugador_id', curbeloId).eq('etapa_id', 5).maybeSingle();
    if (!existingCurbeloIns) {
        const { error: curbeloInsErr } = await supabase.from('inscripciones').insert({
            jugador_id: curbeloId,
            etapa_id: 5,
            estado: 'pagada',
            fecha_inscripcion: new Date().toISOString()
        });
        if (curbeloInsErr) throw curbeloInsErr;
        console.log('Juan Rodriguez Curbelo registered for Etapa 5.');
    }

    console.log('--- Database updates completed successfully ---');
}

main().catch(err => {
    console.error('Error applying updates:', err);
    process.exit(1);
});
