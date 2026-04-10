const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function extractRankingNames() {
    try {
        const { data: etapas, error } = await supabase
            .from('etapas')
            .select('archivo_excel')
            .eq('estado', 'finalizada')
            .order('fecha', { ascending: false });

        if (error) {
            console.error('Error fetching etapas:', error);
            return;
        }

        const latestRankingNames = new Set();
        etapas.forEach(etapa => {
            if (etapa.archivo_excel) {
                try {
                    const json = JSON.parse(etapa.archivo_excel);
                    if (json.categorias) {
                        Object.values(json.categorias).forEach(catPlayers => {
                            catPlayers.forEach(p => latestRankingNames.add(p.name));
                        });
                    }
                } catch (e) {
                    console.error('Error parsing JSON from etapa:', e);
                }
            }
        });

        console.log('Unique NickNames in classifications:', Array.from(latestRankingNames).sort());
    } catch (e) {
        console.error('Execution Error:', e);
    }
}

extractRankingNames();
