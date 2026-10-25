const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const listPlata = [
    'Jordi Ortega López',
    'Santiago Jimenez Ortiz',
    'Jesús Pizarro Gonzálvez',
    'Marc Company Salvat',
    'David Linares Ramos',
    'Fernando Martínez Guillamón',
    'Raúl Linares Ramos',
    'Giacomo Bonacini',
    'Erik Matarrubia Galera',
    'David Rojo Dengra',
    'Juan Medina',
    'Luca Rubinacci',
    'D. Cortés',
    'Joan Torre Rodríguez',
    'Sergio Blocona',
    'Juan Rodriguez Curbelo',
    'Marc Arrebola Sans',
    'Pol Santoro Dominguez',
    'J.Montesinos'
];

async function main() {
    const { data: etapa, error } = await supabase
        .from('etapas')
        .select('*')
        .eq('id', 6)
        .single();
        
    if (error || !etapa) {
        console.error('Error stage 6:', error);
        return;
    }

    const json = JSON.parse(etapa.archivo_excel);
    
    // Create Liga Plata category
    json.categorias['Liga Plata'] = listPlata.map((name, idx) => ({
        name: name,
        total: 0,
        pos: idx + 1
    }));

    const { data, error: updateError } = await supabase
        .from('etapas')
        .update({ archivo_excel: JSON.stringify(json) })
        .eq('id', 6)
        .select();

    if (updateError) {
        console.error('Error updating:', updateError);
    } else {
        console.log('Stage 6 updated with Liga Plata successfully.');
    }
}

main().catch(console.error);
