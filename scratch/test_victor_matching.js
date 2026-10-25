const { matchPlayerToDb } = require('../lib/matching');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: dbPlayers } = await supabase.from('jugadores').select('*');
    
    // Test match for 'Victor Alvarez'
    const match = matchPlayerToDb('Victor Alvarez', dbPlayers);
    console.log('Match result for "Victor Alvarez":');
    console.log('Found:', !!match.player);
    if (match.player) {
        console.log('Nickname:', match.player.nickname);
        console.log('Nombre Completo:', match.player.nombre_completo);
    } else {
        console.log('No match found!');
    }
}
main().catch(console.error);
