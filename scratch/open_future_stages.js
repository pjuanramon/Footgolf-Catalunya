const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function openFutureStages() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('CRITICAL: Missing Supabase env vars');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = '2026-06-02';
    console.log(`Abriendo inscripciones para todas las etapas futuras (fecha >= ${today})...`);

    // Obtener las etapas futuras que están cerradas
    const { data: stages, error: fetchError } = await supabase
        .from('etapas')
        .select('id, nombre, fecha, estado')
        .gte('fecha', today);

    if (fetchError) {
        console.error('Error al obtener las etapas:', fetchError.message);
        process.exit(1);
    }

    console.log('Etapas encontradas en el futuro:', stages);

    // Actualizar el estado a 'abierta' para las etapas futuras que están cerradas o no finalizadas
    const stagesToOpen = stages.filter(s => s.estado !== 'finalizada');
    
    if (stagesToOpen.length === 0) {
        console.log('No hay etapas futuras que requieran ser abiertas.');
        return;
    }

    const idsToUpdate = stagesToOpen.map(s => s.id);
    console.log('Abriendo etapas con IDs:', idsToUpdate);

    const { data: updatedData, error: updateError } = await supabase
        .from('etapas')
        .update({ estado: 'abierta' })
        .in('id', idsToUpdate)
        .select();

    if (updateError) {
        console.error('❌ Error al actualizar las etapas:', updateError.message);
    } else {
        console.log('✅ Etapas actualizadas correctamente:');
        updatedData.forEach(s => {
            console.log(`- ${s.nombre} (${s.fecha}): estado = ${s.estado}`);
        });
    }
}

openFutureStages();
