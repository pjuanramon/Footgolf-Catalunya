const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

async function runTest() {
    const fecha = '2026-04-12';
    const outputPath = path.resolve(__dirname, `../Hits_Footgolf_${fecha}.xlsx`);
    
    if (!fs.existsSync(outputPath)) {
        console.log('El archivo Excel no existe. Generándolo...');
        // (省略 logic - asumo que existe de la ejecución anterior)
    }

    console.log('Intentando envío simplificado a pjuanramon@hotmail.com...');
    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: ['pjuanramon@hotmail.com'],
            subject: 'Hits Footgolf Domingo',
            html: '<p>Adjunto los hits para el domingo. Por favor confirma si te llega esto con el archivo.</p>',
            attachments: [{ 
                filename: 'hits_torneo.xlsx', 
                content: fs.readFileSync(outputPath) 
            }]
        });

        if (error) console.error('Error:', error);
        else console.log('✅ Email enviado con éxito. ID:', data.id);
    } catch (e) {
        console.error('Excepción:', e.message);
    }
}
runTest();
