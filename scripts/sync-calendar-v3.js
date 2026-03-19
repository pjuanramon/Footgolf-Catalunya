const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
    console.log('--- Sincronización Final Calendario 2026 ---');

    // Limpiar etapas actuales
    await supabase.from('etapas').delete().neq('id', 0);

    // Definir las 12 etapas con estados VÁLIDOS (según el CHECK del SQL)
    // Estados permitidos: 'abierta', 'cerrada', 'finalizada'
    const etapas = [
        { id: 1, nombre: 'Etapa 1', fecha: '2026-01-24', ubicacion: 'La Garriga', estado: 'finalizada' },
        { id: 2, nombre: 'Etapa 2', fecha: '2026-02-28', ubicacion: 'La Garriga', estado: 'finalizada' },
        { id: 3, nombre: 'Etapa 3', fecha: '2026-03-15', ubicacion: 'La Roca', estado: 'finalizada' },
        { id: 4, nombre: 'Etapa 4', fecha: '2026-04-12', ubicacion: 'La Roca', estado: 'abierta' },
        { id: 5, nombre: 'Etapa 5', fecha: '2026-06-13', ubicacion: 'La Garriga', estado: 'cerrada' },
        { id: 6, nombre: 'Etapa 6', fecha: '2026-07-04', ubicacion: 'La Garriga', estado: 'cerrada' },
        { id: 7, nombre: 'Etapa 7', fecha: '2026-07-19', ubicacion: 'La Roca', estado: 'cerrada' },
        { id: 8, nombre: 'Etapa 8', fecha: '2026-08-01', ubicacion: 'La Garriga', estado: 'cerrada' },
        { id: 9, nombre: 'Etapa 9', fecha: '2026-09-20', ubicacion: 'La Roca', estado: 'cerrada' },
        { id: 10, nombre: 'Etapa 10', fecha: '2026-10-24', ubicacion: 'La Garriga', estado: 'cerrada' },
        { id: 11, nombre: 'Etapa 11', fecha: '2026-11-15', ubicacion: 'La Roca', estado: 'cerrada' },
        { id: 12, nombre: 'Etapa 12', fecha: '2026-11-29', ubicacion: 'La Roca', estado: 'cerrada' }
    ];

    const { error: insError } = await supabase.from('etapas').insert(etapas);
    
    if (insError) {
        console.error('❌ Error crítico al insertar:', insError);
    } else {
        console.log('✅ ¡Las 12 etapas han sido cargadas correctamente!');
        const { data: final } = await supabase.from('etapas').select('id, nombre, estado').order('id');
        console.log('--- RECUENTO FINAL EN DB ---');
        final.forEach(e => console.log(`- ${e.nombre}: ${e.estado}`));
    }
}

sync();
