const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // 1. Get Pol Santoro Dominguez
    const { data: players } = await supabase
        .from('jugadores')
        .select('*')
        .or('nickname.ilike.%Pol%,nombre_completo.ilike.%Pol%');
        
    console.log('--- PLAYERS FOUND WITH "Pol" ---');
    console.log(players);

    if (players && players.length > 0) {
        for (const p of players) {
            const { data: licencias } = await supabase
                .from('licencias')
                .select('*')
                .eq('jugador_id', p.id);
            console.log(`--- LICENCIAS FOR ${p.nickname} (ID: ${p.id}) ---`);
            console.log(licencias);
        }
    }
}

main().catch(console.error);
