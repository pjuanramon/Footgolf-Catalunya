const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = 'c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/.env';
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testInsert() {
    console.log("--- INTENTANDO INSERCIÓN MANUAL ---");
    const data = {
        etapa_id: 4,
        jugador_id: 'a6f73ff3-a3e6-4dc3-9ba4-08f6cb8c70a8', // Daniel Abril
        puntos_absoluta: 180,
        puntos_rookie: 215,
        score: -5
    };

    const { error } = await supabase.from('resultados_etapas').upsert(data, { onConflict: 'etapa_id, jugador_id' });
    
    if (error) {
        console.error("❌ ERROR AL INSERTAR:", error);
    } else {
        console.log("✅ INSERCIÓN EXITOSA");
    }
}

testInsert();
