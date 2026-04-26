const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = 'c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/.env';
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkJson() {
    console.log("--- REVISANDO RESUMEN JSON ETAPA 4 ---");
    const { data: etapa } = await supabase.from('etapas').select('archivo_excel').eq('id', 4).single();
    
    if (!etapa || !etapa.archivo_excel) {
        console.log("No hay resumen JSON guardado.");
        return;
    }

    try {
        const json = JSON.parse(etapa.archivo_excel);
        console.log("Última actualización:", json.ultima_actualizacion);

        const daniel = json.categorias['Absoluta'].find(p => p.name.includes('Abril'));
        console.log("Datos de Daniel Abril en el JSON final:", daniel);
        
        const alberto = json.categorias['Absoluta'].find(p => p.name.includes('Salazar'));
        console.log("Datos de Alberto Salazar en el JSON final:", alberto);

    } catch (e) {
        console.log("Error parseando JSON:", e.message);
    }
}

checkJson();
