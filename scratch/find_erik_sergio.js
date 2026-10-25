const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findPlayers() {
    const { data } = await supabase
        .from('jugadores')
        .select('*');
        
    console.log('--- ERIK / MATARRUBIA ---');
    data.forEach(p => {
        if (p.nickname.toLowerCase().includes('erik') || p.nombre_completo?.toLowerCase().includes('erik') ||
            p.nickname.toLowerCase().includes('matarrubia') || p.nombre_completo?.toLowerCase().includes('matarrubia')) {
            console.log(p);
        }
    });

    console.log('--- SERGIO / BLOCONA ---');
    data.forEach(p => {
        if (p.nickname.toLowerCase().includes('sergio') || p.nombre_completo?.toLowerCase().includes('sergio') ||
            p.nickname.toLowerCase().includes('blocona') || p.nombre_completo?.toLowerCase().includes('blocona')) {
            console.log(p);
        }
    });
}
findPlayers();
