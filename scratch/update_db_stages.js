const { createClient } = require('@supabase/supabase-js');

async function updateStages() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('CRITICAL: Missing Supabase env vars');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Actualizando fechas de etapas en Supabase...');

    const updates = [
        { id: 7, fecha: '2026-07-18', ubicacion: 'La Garriga' },
        { id: 9, fecha: '2026-09-19', ubicacion: 'La Garriga' },
        { id: 11, fecha: '2026-11-14', ubicacion: 'La Garriga' },
        { id: 12, fecha: '2026-11-28', ubicacion: 'La Garriga' }
    ];

    for (const upd of updates) {
        const { error } = await supabase
            .from('etapas')
            .update({ fecha: upd.fecha, ubicacion: upd.ubicacion })
            .eq('id', upd.id);

        if (error) {
            console.error(`❌ Error actualizando etapa ${upd.id}:`, error.message);
        } else {
            console.log(`✅ Etapa ${upd.id} actualizada correctamente a ${upd.fecha} en ${upd.ubicacion}`);
        }
    }
}

updateStages();
