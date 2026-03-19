const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://haiexkgguayurvdzqqsv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3NDk2MiwiZXhwIjoyMDg5MzUwOTYyfQ.6XHINMNQZvYUsnDkneaFj-Et96Y6SujuJ0L1V8f7tX8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function investigate() {
    const results = {};
    
    // 1. Usuarios
    const { data: usuario } = await supabase
        .from('jugadores')
        .select('*')
        .or('email.eq.pjuanramon@hotmail.com,nickname.ilike.%juanra%');
    results.usuarios = usuario;

    // 2. Sospechoso
    const { data: sospechoso } = await supabase
        .from('jugadores')
        .select('*')
        .eq('email', 'jacmeinbc@gmail.com');
    results.sospechoso = sospechoso;

    fs.writeFileSync('c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/tmp_investigation.json', JSON.stringify(results, null, 2));
    console.log('Resultados guardados en tmp_investigation.json');
}

investigate();
