const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env manualmente si dotenv no está
const envPath = 'c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/.env';
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("--- DIAGNÓSTICO DE PUNTOS ---");
    const { data: p } = await supabase.from('jugadores')
        .select('id, nickname')
        .or('nickname.ilike.%Salazar%,nickname.ilike.%Abril%');
    
    console.log("Jugadores encontrados:", p);

    if (p && p.length > 0) {
        const ids = p.map(x => x.id);
        const { data: res } = await supabase.from('resultados_etapas')
            .select('*')
            .in('jugador_id', ids)
            .eq('etapa_id', 4);
        
        console.log("Resultados Etapa 4 en DB:", res);
    }
}

check();
