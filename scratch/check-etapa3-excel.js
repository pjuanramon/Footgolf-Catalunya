const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: etapa } = await supabase.from('etapas').select('*').eq('id', 3).single();
    console.log('Etapa 3 database record:', {
        id: etapa.id,
        nombre: etapa.nombre,
        fecha: etapa.fecha,
        estado: etapa.estado,
        archivo_excel_snippet: etapa.archivo_excel ? etapa.archivo_excel.substring(0, 500) : null
    });
}

check().catch(console.error);
