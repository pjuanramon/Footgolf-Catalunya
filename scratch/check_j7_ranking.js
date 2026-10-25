const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: etapa, error } = await supabase
        .from('etapas')
        .select('archivo_excel')
        .eq('id', 7)
        .single();
        
    if (error || !etapa) {
        console.error('Error fetching stage 7:', error);
        return;
    }

    const info = JSON.parse(etapa.archivo_excel);
    const absoluta = info.categorias['Absoluta'];
    const plata = info.categorias['Liga Plata'];
    
    console.log('--- ETAPA 7 ABSOLUTA RANKING ---');
    absoluta.slice(0, 10).forEach(p => {
        console.log(`${p.pos}. ${p.name} - Total: ${p.total}`);
    });

    console.log('\n--- ETAPA 7 LIGA PLATA RANKING ---');
    if (plata) {
        plata.forEach(p => {
            console.log(`${p.pos}. ${p.name} - Total: ${p.total} | e7: ${p.e7}`);
        });
    } else {
        console.log('No Liga Plata category found!');
    }
}

main().catch(console.error);
