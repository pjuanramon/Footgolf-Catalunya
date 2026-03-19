const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
    console.log('--- Iniciando Sincronización Temporada 2026 ---');

    // 1. Limpiar tablas (Opcional, pero recomendado para el reset)
    console.log('Limpiando datos antiguos...');
    await supabase.from('inscripciones').delete().neq('id', 0);
    await supabase.from('licencias').delete().neq('id', 0);
    await supabase.from('jugadores').delete().neq('id', 0);
    await supabase.from('resultados_etapas').delete().neq('id', 0);
    await supabase.from('etapas').delete().neq('id', 0);

    // 2. Definir las 12 etapas
    const etapas = [
        { id: 1, nombre: 'Etapa 1', fecha: '2026-01-24', ubicacion: 'La Garriga', estado: 'finalizada' },
        { id: 2, nombre: 'Etapa 2', fecha: '2026-02-28', ubicacion: 'La Garriga', estado: 'finalizada' },
        { id: 3, nombre: 'Etapa 3', fecha: '2026-03-15', ubicacion: 'La Roca', estado: 'finalizada' },
        { id: 4, nombre: 'Etapa 4', fecha: '2026-04-12', ubicacion: 'La Roca', estado: 'abierta' },
        { id: 5, nombre: 'Etapa 5', fecha: '2026-06-13', ubicacion: 'La Garriga', estado: 'proxima' },
        { id: 6, nombre: 'Etapa 6', fecha: '2026-07-04', ubicacion: 'La Garriga', estado: 'proxima' },
        { id: 7, nombre: 'Etapa 7', fecha: '2026-07-19', ubicacion: 'La Roca', estado: 'proxima' },
        { id: 8, nombre: 'Etapa 8', fecha: '2026-08-01', ubicacion: 'La Garriga', estado: 'proxima' },
        { id: 9, nombre: 'Etapa 9', fecha: '2026-09-20', ubicacion: 'La Roca', estado: 'proxima' },
        { id: 10, nombre: 'Etapa 10', fecha: '2026-10-24', ubicacion: 'La Garriga', estado: 'proxima' },
        { id: 11, nombre: 'Etapa 11', fecha: '2026-11-15', ubicacion: 'La Roca', estado: 'proxima' },
        { id: 12, nombre: 'Etapa 12', fecha: '2026-11-29', ubicacion: 'La Roca', estado: 'proxima' }
    ];

    console.log('Insertando etapas...');
    const { error: insertError } = await supabase.from('etapas').insert(etapas);
    
    if (insertError) {
        console.error('Error insertando etapas:', insertError);
    } else {
        console.log('¡12 etapas sincronizadas correctamente!');
    }

    console.log('--- Proceso Finalizado ---');
}

sync().catch(console.error);
