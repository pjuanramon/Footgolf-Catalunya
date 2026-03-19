const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://haiexkgguayurvdzqqsv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3NDk2MiwiZXhwIjoyMDg5MzUwOTYyfQ.6XHINMNQZvYUsnDkneaFj-Et96Y6SujuJ0L1V8f7tX8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function investigate() {
    // 1. Usuario
    const { data: usuario } = await supabase
        .from('jugadores')
        .select('id, nickname, email, anio_licencia')
        .or('email.eq.pjuanramon@hotmail.com,nickname.ilike.%juanra%');
    console.log('USUARIOS_MATCH:', JSON.stringify(usuario, null, 2));

    // 2. Sospechoso
    const { data: sospechoso } = await supabase
        .from('jugadores')
        .select('id, nickname, email, created_at')
        .eq('email', 'jacmeinbc@gmail.com');
    console.log('SOSPECHOSO:', JSON.stringify(sospechoso, null, 2));

    // 3. Tabla licencias columnas
    const { data: sample } = await supabase.from('licencias').select('*').limit(1);
    console.log('COLUMNAS_LICENCIAS:', sample && sample.length > 0 ? Object.keys(sample[0]) : 'Sin datos');
}

investigate();
