const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const handler = require('../api/_logic/clasificacion/procesar-etapa');

async function reprocess(etapaName, fileName, desempates) {
    const { data: etapa } = await supabase
        .from('etapas')
        .select('*')
        .eq('nombre', etapaName)
        .single();
        
    if (!etapa) {
        console.error('Stage not found:', etapaName);
        return;
    }
    console.log(`Processing ${etapaName} (ID: ${etapa.id}) with file ${fileName}...`);

    const excelPath = path.resolve(__dirname, `../Resultados_Torneos/${fileName}`);
    if (!fs.existsSync(excelPath)) {
        console.error('File not found:', excelPath);
        return;
    }
    const buffer = fs.readFileSync(excelPath);
    const excel_base64 = buffer.toString('base64');

    const req = {
        method: 'POST',
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET },
        body: {
            etapa_id: etapa.id,
            excel_base64,
            mode: 'commit',
            desempates
        }
    };

    let responseData = null;
    const res = {
        status: function(code) { return this; },
        json: function(data) { responseData = data; return this; }
    };

    await handler(req, res);
    console.log(`Done. Status:`, responseData.ok ? 'SUCCESS' : 'FAILED');
    if (responseData.error) console.error('Error:', responseData.error);
    if (responseData.logs) {
        console.log('Logs:');
        responseData.logs.forEach(l => console.log('  >', l));
    }
}

async function main() {
    // 1. Reprocess Etapa 3: 
    // - Jorge Santiago Buqueras (01a0156e-0161-4415-a37a-1395d958ad26) won Absoluta tie-break
    // - Ivan Luengo Robles (c7433e20-2615-4396-880d-f0a76c5c081d) won Rookie tie-break
    await reprocess(
        'Etapa 3',
        'Tournament Report from 3a Jornada Liga Catalana generated -2026-05-31 05_11_53.xlsx',
        { 
            '01a0156e-0161-4415-a37a-1395d958ad26': true,
            'c7433e20-2615-4396-880d-f0a76c5c081d': true
        }
    );

    console.log('\n----------------------------------------\n');

    // 2. Reprocess Etapa 4: 
    // - Daniel Abril Amador (a6f73ff3-a3e6-4dc3-9ba4-08f6cb8c70a8) won Rookie tie-break
    // - Alberto Salazar Fernández (623e8adf-1b33-430c-8ee1-c1363b660f08) won Absoluta tie-break
    await reprocess(
        'Etapa 4',
        'Tournament Report from 4a Jornada Liga Catalana generated -2026-05-31 05_11_33.xlsx',
        { 
            'a6f73ff3-a3e6-4dc3-9ba4-08f6cb8c70a8': true,
            '623e8adf-1b33-430c-8ee1-c1363b660f08': true
        }
    );
}

main().catch(console.error);
