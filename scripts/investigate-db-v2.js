const { createClient } = require('@supabase/supabase-js');

// Valores extraídos del .env visto anteriormente
const SUPABASE_URL = 'https://haiexkgguayurvdzqqsv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3NDk2MiwiZXhwIjoyMDg5MzUwOTYyfQ.6XHINMNQZvYUsnDkneaFj-Et96Y6SujuJ0L1V8f7tX8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function investigate() {
    console.log('--- Investigando Jugadores ---');
    
    // 1. Buscar al usuario
    const { data: usuario, error: uErr } = await supabase
        .from('jugadores')
        .select('*')
        .or('email.eq.pjuanramon@hotmail.com,nickname.ilike.%juanra%');
    
    console.log('Posibles registros del usuario:', usuario);

    // 2. Buscar al jugador sospechoso
    const { data: sospechoso, error: sErr } = await supabase
        .from('jugadores')
        .select('*')
        .eq('email', 'jacmeinbc@gmail.com');
    
    console.log('Jugador sospechoso (jacmeinbc@gmail.com):', sospechoso);

    // 3. Estructura de licencias
    const { data: licCols } = await supabase.from('licencias').select('*').limit(1);
    console.log('Columnas licencias:', licCols && licCols.length > 0 ? Object.keys(licCols[0]) : 'vacía');
}

investigate();
