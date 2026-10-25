const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // 1. Get Luca Rubinacci in jugadores
    const { data: player, error: playerError } = await supabase
        .from('jugadores')
        .select('*')
        .eq('nickname', 'Luca Rubinacci')
        .single();
        
    if (playerError) {
        console.error('Error fetching player:', playerError);
        return;
    }
    console.log('--- LUCA RUBINACCI IN DB ---');
    console.log(player);

    // 2. Get licencias for Luca Rubinacci
    const { data: licencias, error: licError } = await supabase
        .from('licencias')
        .select('*')
        .eq('jugador_id', player.id);
        
    if (licError) {
        console.error('Error fetching licencias:', licError);
        return;
    }
    console.log('--- LICENCIAS IN DB ---');
    console.log(licencias);
}
main().catch(console.error);
