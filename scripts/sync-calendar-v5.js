const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
    console.log('--- Sincronización Total 2026 (Individual + Equipos) ---');

    // Limpiar etapas actuales
    await supabase.from('etapas').delete().neq('id', 0);

    const etapas = [
        // Individuales
        { id: 1, nombre: 'Etapa 1', fecha: '2026-01-24', ubicacion: 'La Garriga', estado: 'finalizada', tipo: 'individual' },
        { id: 2, nombre: 'Etapa 2', fecha: '2026-02-28', ubicacion: 'La Garriga', estado: 'finalizada', tipo: 'individual' },
        { id: 3, nombre: 'Etapa 3', fecha: '2026-03-15', ubicacion: 'La Garriga', estado: 'finalizada', tipo: 'individual' },
        { id: 4, nombre: 'Etapa 4', fecha: '2026-04-12', ubicacion: 'La Garriga', estado: 'finalizada', tipo: 'individual' },
        
        // Equipos J1
        { id: 201, nombre: 'Camp. Equipos - Jornada 1', fecha: '2026-05-10', ubicacion: 'La Garriga', estado: 'finalizada', tipo: 'equipos', precio_equipo: 110 },
        
        // Equipos J2
        { id: 202, nombre: 'Camp. Equipos - Jornada 2', fecha: '2026-05-30', ubicacion: 'La Garriga', estado: 'abierta', tipo: 'equipos', precio_equipo: 110 },

        // Individuales 5-9
        { id: 5, nombre: 'Etapa 5', fecha: '2026-06-13', ubicacion: 'La Garriga', estado: 'cerrada', tipo: 'individual' },
        { id: 6, nombre: 'Etapa 6', fecha: '2026-07-04', ubicacion: 'La Garriga', estado: 'cerrada', tipo: 'individual' },
        { id: 7, nombre: 'Etapa 7', fecha: '2026-07-18', ubicacion: 'La Garriga', estado: 'cerrada', tipo: 'individual' },
        { id: 8, nombre: 'Etapa 8', fecha: '2026-08-01', ubicacion: 'La Garriga', estado: 'cerrada', tipo: 'individual' },
        { id: 9, nombre: 'Etapa 9', fecha: '2026-09-19', ubicacion: 'La Garriga', estado: 'cerrada', tipo: 'individual' },
        
        // Copa Catalana
        { id: 100, nombre: 'Copa Catalana', fecha: '2026-10-03', ubicacion: 'La Garriga', estado: 'cerrada', tipo: 'individual' },

        // Individuales 10-12
        { id: 10, nombre: 'Etapa 10', fecha: '2026-10-24', ubicacion: 'La Garriga', estado: 'cerrada', tipo: 'individual' },
        { id: 11, nombre: 'Etapa 11', fecha: '2026-11-07', ubicacion: 'La Garriga', estado: 'cerrada', tipo: 'individual' },
        { id: 12, nombre: 'Etapa 12', fecha: '2026-11-14', ubicacion: 'La Garriga', estado: 'cerrada', tipo: 'individual' },
        
        // Final Equipos
        { id: 203, nombre: 'Final Campeonato por Equipos', fecha: '2026-12-12', ubicacion: 'La Garriga', estado: 'cerrada', tipo: 'equipos', precio_equipo: 110 }
    ];

    const { error: insError } = await supabase.from('etapas').insert(etapas);
    
    if (insError) {
        console.error('❌ Error (¿Has ejecutado el SQL en Supabase?):', insError.message);
    } else {
        console.log('✅ ¡Las 16 etapas cargadas correctamente!');
    }
}

sync();
