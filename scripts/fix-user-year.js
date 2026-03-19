const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://haiexkgguayurvdzqqsv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3NDk2MiwiZXhwIjoyMDg5MzUwOTYyfQ.6XHINMNQZvYUsnDkneaFj-Et96Y6SujuJ0L1V8f7tX8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runUpdate() {
    const { data, error } = await supabase
        .from('jugadores')
        .update({ anio_licencia: 2018 })
        .eq('id', '80808d1a-3f56-4879-ab0f-d2891e2d36c8');
    
    if (error) console.error('Error actualizando:', error);
    else console.log('Año de licencia actualizado a 2018 para JuanRa Perez.');
}

runUpdate();
