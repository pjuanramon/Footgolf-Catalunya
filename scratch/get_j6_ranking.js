const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: etapa, error } = await supabase
        .from('etapas')
        .select('archivo_excel')
        .eq('id', 6)
        .single();
        
    if (error || !etapa) {
        console.error('Error fetching stage:', error);
        return;
    }

    const info = JSON.parse(etapa.archivo_excel);
    const absoluta = info.categorias['Absoluta'];
    const plata = info.categorias['Liga Plata'];
    console.log('Total players in Absoluta:', absoluta.length);
    console.log('Total players in Liga Plata:', plata ? plata.length : 'undefined');
    if (plata) {
        console.log('--- LIGA PLATA RANKING ---');
        plata.forEach(p => {
            console.log(`${p.pos}. ${p.name} - Total: ${p.total}`);
        });
    }
}

main().catch(console.error);
