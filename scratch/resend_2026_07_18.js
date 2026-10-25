const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
    const formattedPath = path.resolve(__dirname, '../Hits_Footgolf_2026-07-18_Formatted.xlsx');
    if (!fs.existsSync(formattedPath)) {
        console.error('File not found:', formattedPath);
        process.exit(1);
    }

    const outputFileName = 'Hits_Footgolf_2026-07-18.xlsx';
    const subject = `Hits Footgolf – Torneo 18/07/2026 – Registro cerrado (Nombres Formateados)`;
    const recipients = ['pjuanramon@hotmail.com', 'jorge.s.b@hotmail.com'];
    
    for (const email of recipients) {
        console.log(`Intentando enviar a: ${email}...`);
        try {
            const { data, error } = await resend.emails.send({
                from: 'onboarding@resend.dev',
                to: [email],
                subject: subject,
                html: `<p>Se adjuntan los hits corregidos para el torneo del 18/07/2026 con el formato de nombre corto (inicial y primer apellido).</p>`,
                attachments: [{ filename: outputFileName, content: fs.readFileSync(formattedPath) }]
            });

            if (error) {
                console.error(`❌ Error enviando a ${email}:`, error.message || error);
            } else {
                console.log(`✅ Email enviado con éxito a ${email}. ID: ${data.id}`);
            }
        } catch (err) {
            console.error(`❌ Excepción enviando a ${email}:`, err.message);
        }
    }
}

main().catch(console.error);
