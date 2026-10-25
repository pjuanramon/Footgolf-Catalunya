const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPlayers() {
    const { data } = await supabase
        .from('jugadores')
        .select('*')
        .in('nickname', ['David Linares Ramos', 'Fernando Martínez Guillamón']);
    console.log(data);
}
checkPlayers();
