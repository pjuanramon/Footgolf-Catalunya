const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const handler = require('../api/_logic/clasificacion/procesar-etapa');

async function removeLicense() {
    console.log('--- Removing Pol Santoro License ---');
    // 1. Delete 2026 license for Pol Santoro (ID: 7735029f-ef93-4dbc-9a55-907651401567)
    const { error: deleteError } = await supabase
        .from('licencias')
        .delete()
        .eq('jugador_id', '7735029f-ef93-4dbc-9a55-907651401567')
        .eq('anio', 2026);
        
    if (deleteError) {
        console.error('Error deleting license:', deleteError);
    } else {
        console.log('License record deleted.');
    }

    // 2. Set tiene_licencia = false in jugadores
    const { error: playerError } = await supabase
        .from('jugadores')
        .update({ tiene_licencia: false })
        .eq('id', '7735029f-ef93-4dbc-9a55-907651401567');

    if (playerError) {
        console.error('Error updating player:', playerError);
    } else {
        console.log('Player tiene_licencia set to false.');
    }
}

async function reprocessStage(etapaName, fileName, desempates) {
    const { data: etapa } = await supabase
        .from('etapas')
        .select('*')
        .eq('nombre', etapaName)
        .single();
        
    if (!etapa) {
        console.error('Stage not found:', etapaName);
        return;
    }
    console.log(`\nReprocessing ${etapaName} (ID: ${etapa.id}) with file ${fileName}...`);

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
}

async function main() {
    // 1. Remove license
    await removeLicense();

    // 2. Reprocess J3, J4, J5, J6 in order
    await reprocessStage(
        'Etapa 3',
        'Tournament Report from 3a Jornada Liga Catalana generated -2026-05-31 05_11_53.xlsx',
        { 
            '01a0156e-0161-4415-a37a-1395d958ad26': true,
            'c7433e20-2615-4396-880d-f0a76c5c081d': true
        }
    );

    await reprocessStage(
        'Etapa 4',
        'Tournament Report from 4a Jornada Liga Catalana generated -2026-05-31 05_11_33.xlsx',
        { 
            'a6f73ff3-a3e6-4dc3-9ba4-08f6cb8c70a8': true,
            '623e8adf-1b33-430c-8ee1-c1363b660f08': true
        }
    );

    await reprocessStage(
        'Etapa 5',
        'Tournament Report from 5a etapa Liga Catalana generated -2026-06-16 12_48_13.xlsx',
        { 
            'c7433e20-2615-4396-880d-f0a76c5c081d': true
        }
    );

    await reprocessStage(
        'Etapa 6',
        'Tournament Report from 6a etapa Liga Catalana generated -2026-07-07 12_26_48.xlsx',
        {}
    );

    // 3. Print new ranking after Stage 6
    console.log('\n--- NEW ABSOLUTA RANKING ---');
    const { data: etapa6 } = await supabase
        .from('etapas')
        .select('archivo_excel')
        .eq('id', 6)
        .single();
    const info = JSON.parse(etapa6.archivo_excel);
    info.categorias['Absoluta'].forEach(p => {
        console.log(`${p.pos}. ${p.name} - Total: ${p.total}`);
    });
}

main().catch(console.error);
