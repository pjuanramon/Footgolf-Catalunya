const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: results, error } = await supabase
        .from('resultados_etapas')
        .select('*, jugadores(nickname)')
        .eq('etapa_id', 7)
        .order('puntos_absoluta', { ascending: false });
        
    if (error) {
        console.error(error);
        return;
    }
    results.forEach((r, idx) => {
        console.log(`${idx + 1}. ${r.jugadores.nickname} - Score: ${r.score} | Puntos Absoluta: ${r.puntos_absoluta} | Rookie: ${r.puntos_rookie}`);
    });
}
main().catch(console.error);
