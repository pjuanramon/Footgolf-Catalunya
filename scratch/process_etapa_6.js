const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const handler = require('../api/_logic/clasificacion/procesar-etapa');

async function main() {
    // 1. Get Etapa 6
    const { data: etapa, error } = await supabase
        .from('etapas')
        .select('*')
        .eq('nombre', 'Etapa 6')
        .single();
        
    if (error || !etapa) {
        console.error('Error fetching stage:', error);
        return;
    }
    console.log('Found stage:', etapa.nombre, 'ID:', etapa.id);

    // 2. Read the Excel file and convert to base64
    const excelPath = path.resolve(__dirname, '../Resultados_Torneos/Tournament Report from 6a etapa Liga Catalana generated -2026-07-07 12_26_48.xlsx');
    if (!fs.existsSync(excelPath)) {
        console.error('File not found at:', excelPath);
        return;
    }
    const buffer = fs.readFileSync(excelPath);
    const excel_base64 = buffer.toString('base64');

    // 3. Mock request and response to run the handler in preview mode
    const req = {
        method: 'POST',
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET },
        body: {
            etapa_id: etapa.id,
            excel_base64,
            mode: 'commit',
            desempates: {}
        }
    };

    let responseData = null;
    const res = {
        status: function(code) { return this; },
        json: function(data) { responseData = data; return this; }
    };

    await handler(req, res);

    console.log('--- PREVIEW RESULT ---');
    console.log('Ok:', responseData.ok);
    console.log('Mode:', responseData.mode);
    console.log('Error if any:', responseData.error || 'None');
    console.log('Empates Detectados:', JSON.stringify(responseData.empatesDetectados, null, 2));
    if (responseData.logs) {
        console.log('Logs:');
        responseData.logs.forEach(l => console.log('  >', l));
    }
}

main().catch(console.error);
