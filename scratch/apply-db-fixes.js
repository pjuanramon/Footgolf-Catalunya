const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('--- Applying database fixes ---');

    // 1. Register David Rojo in Etapa 5
    const davidRojoId = '9b8d01e2-eb30-4902-8d03-d469f4d14fb6';
    const etapaId = 5;
    
    // Check if already registered
    const { data: existingIns } = await supabase
        .from('inscripciones')
        .select('*')
        .eq('jugador_id', davidRojoId)
        .eq('etapa_id', etapaId)
        .maybeSingle();

    if (existingIns) {
        console.log(`David Rojo already registered for stage ${etapaId}. Status: ${existingIns.estado}`);
        if (existingIns.estado !== 'pagada') {
            const { error: updateErr } = await supabase
                .from('inscripciones')
                .update({ estado: 'pagada' })
                .eq('id', existingIns.id);
            if (updateErr) throw updateErr;
            console.log('David Rojo registration updated to "pagada".');
        }
    } else {
        const { data: newIns, error: insertErr } = await supabase
            .from('inscripciones')
            .insert({
                jugador_id: davidRojoId,
                etapa_id: etapaId,
                estado: 'pagada',
                fecha_inscripcion: new Date().toISOString()
            })
            .select();
        if (insertErr) throw insertErr;
        console.log('David Rojo registered successfully for Etapa 5:', newIns);
    }

    // 2. Adjust Pol Santoro Dominguez
    const polSantoroId = '7735029f-ef93-4dbc-9a55-907651401567';
    const { error: updatePlayerErr } = await supabase
        .from('jugadores')
        .update({
            nombre_completo: 'Pol Santoro Dominguez',
            nickname: 'Pol Santoro Dominguez',
            nickname_normalizado: 'pol santoro dominguez',
            tiene_licencia: true,
            anio_licencia: 2026
        })
        .eq('id', polSantoroId);

    if (updatePlayerErr) throw updatePlayerErr;
    console.log('Pol Santoro Dominguez player record updated.');

    // 3. Create license record for Pol Santoro Dominguez
    const { data: existingLic } = await supabase
        .from('licencias')
        .select('*')
        .eq('jugador_id', polSantoroId)
        .eq('anio', 2026)
        .maybeSingle();

    if (existingLic) {
        console.log('Pol Santoro already has a license for 2026.');
    } else {
        const { data: newLic, error: insertLicErr } = await supabase
            .from('licencias')
            .insert({
                jugador_id: polSantoroId,
                anio: 2026,
                fecha_compra: new Date().toISOString(),
                estado: 'pagada',
                jugador_nombre: 'Pol Santoro Dominguez',
                jugador_nickname: 'Pol Santoro Dominguez'
            })
            .select();
        if (insertLicErr) throw insertLicErr;
        console.log('License created successfully for Pol Santoro:', newLic);
    }

    console.log('--- Database fixes completed ---');
}

main().catch(err => {
    console.error('Error executing database fixes:', err);
    process.exit(1);
});
