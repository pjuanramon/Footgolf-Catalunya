const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const handler = require('../api/_logic/clasificacion/procesar-etapa');

const excelPath = path.resolve(__dirname, '../Resultados_Torneos/Tournament Report from Etapas 7-12 Footgolf Catalunya generated -2026-07-20 10_21_22.xlsx');

async function main() {
    console.log('Reading full Excel:', excelPath);
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet);

    console.log('Total raw rows:', rawRows.length);

    // Filter rows for Ronda 1
    const ronda1Rows = rawRows.filter(row => parseInt(row['RONDA']) === 1);
    console.log('Ronda 1 rows count:', ronda1Rows.length);

    // Create a new Excel workbook in memory with these rows
    const newWs = XLSX.utils.json_to_sheet(ronda1Rows);
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, newWs, 'Worksheet');

    // Write to a buffer and get base64
    const buffer = XLSX.write(newWb, { type: 'buffer', bookType: 'xlsx' });
    const excel_base64 = buffer.toString('base64');

    // Run preview
    const req = {
        method: 'POST',
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET },
        body: {
            etapa_id: 7,
            excel_base64,
            mode: 'commit',
            desempates: {
                'c7433e20-2615-4396-880d-f0a76c5c081d': true
            }
        }
    };

    let responseData = null;
    const res = {
        status: function(code) { return this; },
        json: function(data) { responseData = data; return this; }
    };

    console.log('Starting preview execution for Etapa 7...');
    await handler(req, res);

    console.log('\n--- PREVIEW RESULT ---');
    console.log('Ok:', responseData.ok);
    console.log('Mode:', responseData.mode);
    console.log('Error if any:', responseData.error || 'None');
    console.log('Empates Detectados:');
    if (responseData.empatesDetectados) {
        responseData.empatesDetectados.forEach(emp => {
            console.log(`  Categoría: ${emp.categoria} | Score: ${emp.score}`);
            emp.jugadores.forEach(j => {
                console.log(`    - Name: ${j.name} | ID: ${j.id}`);
            });
        });
    }
    console.log('Logs:');
    if (responseData.logs) {
        responseData.logs.forEach(l => console.log('  >', l));
    }
}

main().catch(console.error);
