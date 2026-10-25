const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Map from the current names in the file to the exact desired names from user screenshots
const exactCorrectionMap = {
    'E. Martin': 'E. MartinRdz',
    'E. MartinRdz': 'E. MartinRdz',
    'A. Leiva': 'A. Leiva',
    'S. Jimenez': 'S. Jimenez',
    'V. Álvarez': 'V. Alvarez',
    'V. Alvarez': 'V. Alvarez',
    'M. Arrebola': 'M. Arrebola',
    'J. Montesinos': 'J. Montesinos',
    'A. Salazar': 'A. Salazar',
    'C. Martínez': 'C. Guillamon',
    'C. Guillamon': 'C. Guillamon',
    'E. Matarrubia': 'E. Matarrubia',
    'M. Company': 'M. Company',
    'J. Pizarro': 'J. Pizarro',
    'G. Masuck': 'G. Masuck',
    'J. Martín': 'J. MartínGcia',
    'J. MartínGcia': 'J. MartínGcia',
    'D. Abril': 'D. Abril',
    'J. Pérez': 'J. Perez',
    'J. Perez': 'J. Perez',
    'S. Pahisa': 'S. Pahisa',
    'X. Leiva': 'X. Leiva',
    'D. Rojo': 'D. Rojo',
    'J. Santiago': 'J. Santiago',
    'I. Luengo': 'I. Luengo',
    'D. Tellez': 'D. Tellez',
    'D. Linares': 'D. Linares'
};

async function main() {
    // Read the file (which has the names in the correct order but with E. Martin, etc.)
    const workbook = XLSX.readFile('Hits_Footgolf_2026-07-18.xlsx');
    
    const hitsSheet = workbook.Sheets['HITS'];
    const footgolfersSheet = workbook.Sheets['FOOTGOLFERS'];
    
    const hitsData = XLSX.utils.sheet_to_json(hitsSheet);
    const footgolfersData = XLSX.utils.sheet_to_json(footgolfersSheet);
    
    // 1. Correct the names using the exactCorrectionMap
    const updatedFootgolfers = footgolfersData.map(row => {
        const currentName = row['Footgolfer'].trim();
        const corrected = exactCorrectionMap[currentName] || currentName;
        console.log(`Correcting: "${currentName}" -> "${corrected}"`);
        return {
            ...row,
            'Footgolfer': corrected
        };
    });
    
    // 2. Set HITS starting times starting at 5:00 PM (17:00)
    let currentStartTime = new Date('2026-07-18T17:00:00');
    const updatedHits = hitsData.map((row, index) => {
        const timeStr = `${currentStartTime.getHours().toString().padStart(2, '0')}:${currentStartTime.getMinutes().toString().padStart(2, '0')}`;
        currentStartTime.setMinutes(currentStartTime.getMinutes() + 7);
        return {
            ...row,
            'Hora de Salida \r\n HH:mm': timeStr
        };
    });
    
    // Replace sheets
    workbook.Sheets['HITS'] = XLSX.utils.json_to_sheet(updatedHits);
    workbook.Sheets['FOOTGOLFERS'] = XLSX.utils.json_to_sheet(updatedFootgolfers);
    
    // Save to formatted copy
    const formattedPath = path.resolve(__dirname, '../Hits_Footgolf_2026-07-18_Formatted.xlsx');
    XLSX.writeFile(workbook, formattedPath);
    console.log('Saved corrected file to Hits_Footgolf_2026-07-18_Formatted.xlsx');
    
    // Attempt to overwrite the original one if possible
    try {
        XLSX.writeFile(workbook, 'Hits_Footgolf_2026-07-18.xlsx');
        console.log('Successfully updated original Hits_Footgolf_2026-07-18.xlsx too!');
    } catch (e) {
        console.log('Original is locked, keeping it only in formatted copy.');
    }
    
    // Send email
    const outputFileName = 'Hits_Footgolf_2026-07-18.xlsx';
    const subject = `Hits Footgolf – Torneo 18/07/2026 – Registro cerrado (Nombres y Horarios Corregidos v2)`;
    const recipients = ['pjuanramon@hotmail.com', 'jorge.s.b@hotmail.com'];
    
    for (const email of recipients) {
        console.log(`Intentando enviar a: ${email}...`);
        try {
            const { data, error } = await resend.emails.send({
                from: 'onboarding@resend.dev',
                to: [email],
                subject: subject,
                html: `<p>Se adjuntan los hits corregidos para el torneo del 18/07/2026. Los nombres usan el alias correcto del historial y el primer grupo sale a las 17:00 (5:00 PM).</p>`,
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
