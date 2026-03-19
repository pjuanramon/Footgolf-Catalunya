const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
    console.log('--- Reseteando Calendario 2026 ---');

    // Limpiar etapas actuales
    const { error: delError } = await supabase.from('etapas').delete().neq('id', 0);
    if (delError) console.error('Error al borrar:', delError);

    // Insertar sin IDs explícitos (dejar que la DB los asigne)
    const etapas = [
        { nombre: 'Etapa 1', fecha: '2026-01-24', ubicacion: 'La Garriga', estado: 'finalizada' },
        { nombre: 'Etapa 2', fecha: '2026-02-28', ubicacion: 'La Garriga', estado: 'finalizada' },
        { nombre: 'Etapa 3', fecha: '2026-03-15', ubicacion: 'La Roca', estado: 'finalizada' },
        { nombre: 'Etapa 4', fecha: '2026-04-12', ubicacion: 'La Roca', estado: 'abierta' },
        { nombre: 'Etapa 5', fecha: '2026-06-13', ubicacion: 'La Garriga', estado: 'proxima' },
        { nombre: 'Etapa 6', fecha: '2026-07-04', ubicacion: 'La Garriga', estado: 'proxima' },
        { nombre: 'Etapa 7', fecha: '2026-07-19', ubicacion: 'La Roca', estado: 'proxima' },
        { nombre: 'Etapa 8', fecha: '2026-08-01', ubicacion: 'La Garriga', estado: 'proxima' },
        { nombre: 'Etapa 9', fecha: '2026-09-20', ubicacion: 'La Roca', estado: 'proxima' },
        { nombre: 'Etapa 10', fecha: '2026-10-24', ubicacion: 'La Garriga', estado: 'proxima' },
        { nombre: 'Etapa 11', fecha: '2026-11-15', ubicacion: 'La Roca', estado: 'proxima' },
        { nombre: 'Etapa 12', fecha: '2026-11-29', ubicacion: 'La Roca', estado: 'proxima' }
    ];

    const { error: insError } = await supabase.from('etapas').insert(etapas);
    if (insError) {
        console.error('Error al insertar:', insError);
    } else {
        console.log('¡12 etapas enviadas a Supabase!');
        
        // Verificación inmediata
        const { data: verif } = await supabase.from('etapas').select('id, nombre, estado');
        console.log('VERIFICACIÓN FINAL - Etapas en DB:', verif.length);
        verif.forEach(e => console.log(`[ID:${e.id}] ${e.nombre} - ${e.estado}`));
    }
}

sync();
