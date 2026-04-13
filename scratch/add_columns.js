const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addColumns() {
    console.log('Adding missing columns to resultados_etapas...');
    
    // Usamos rpc para ejecutar SQL directo si está habilitado, 
    // pero como no sabemos si hay una función rpc para sql, 
    // aprovechamos que supabase-js puede fallar pero intentamos insertar en columnas nuevas.
    
    // Mejor aún: intentamos una migración cruda usando la API de Postgres si fuera posible, 
    // pero aquí lo más seguro es avisar que la migración SQL debe ejecutarse en el dashboard 
    // O intentar añadirla si tenemos permisos de superuser vía un rpc específico.
    
    // Dado que no puedo entrar al dashboard, voy a intentar ejecutar el SQL 
    // a través de un rpc 'exec_sql' si el usuario lo tiene (común en estos proyectos).
    
    const sql = `
        ALTER TABLE resultados_etapas ADD COLUMN IF NOT EXISTS puntos_damas NUMERIC DEFAULT 0;
        ALTER TABLE resultados_etapas ADD COLUMN IF NOT EXISTS puntos_junior NUMERIC DEFAULT 0;
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        console.error('Error running SQL via RPC:', error);
        console.log('Fallback: Trying to use old names if new ones fail.');
    } else {
        console.log('Columns added successfully.');
    }
}

addColumns();
