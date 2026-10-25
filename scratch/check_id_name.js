const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: p1 } = await supabase
        .from('jugadores')
        .select('nickname')
        .eq('id', '50967a8f-1ca7-4568-8e38-573e3ad6bbaa')
        .single();
    const { data: p2 } = await supabase
        .from('jugadores')
        .select('nickname')
        .eq('id', 'c7433e20-2615-4396-880d-f0a76c5c081d')
        .single();
        
    console.log('Player 1:', p1?.nickname);
    console.log('Player 2:', p2?.nickname);
}
main().catch(console.error);
