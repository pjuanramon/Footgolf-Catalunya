const { supabase } = require('../lib/supabase');

async function checkCols() {
    const { data, error } = await supabase
        .from('inscripciones')
        .select('*')
        .eq('etapa_id', 100);
    
    console.log('Total etapa 100 rows:', data.length);
    if (data.length > 0) {
        console.log('Keys of row 0:', Object.keys(data[0]));
        console.log('All rows:');
        data.forEach(d => console.log(JSON.stringify(d)));
    }
}

checkCols().catch(console.error);
