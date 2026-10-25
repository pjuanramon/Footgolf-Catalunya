const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const manualMap = {
    'Alberto Leiva cañada': 'A. Leiva',
    'Alberto Leiva cañada ': 'A. Leiva',
    'Alberto Salazar Fernández': 'A. Salazar',
    'Daniel Abril Amador': 'D. Abril',
    'David Linares Ramos': 'D. Linares',
    'David Rojo Dengra': 'D. Rojo',
    'David Rojo Demgra': 'D. Rojo',
    'David Tellez Viana': 'D. Tellez',
    'Eduardo Martin Rodriguez': 'E. MartinRdz',
    'Erik Matarrubia Galera': 'E. Matarrubia',
    'Giacomo Bonacini': 'G. Bonacini',
    'Gastón Masuck Cardozo': 'G. Masuck',
    'Ivan luengo robles': 'I. Luengo',
    'Ivan Luengo Robles': 'I. Luengo',
    'Jordi Martin Garcia': 'J. MartínGcia',
    'Joan Montesinos Vega': 'J. Montesinos',
    'Joan Montesinos': 'J. Montesinos',
    'Jordi Ortega López': 'J. Ortega',
    'Juan Ramón Pérez González': 'J. Perez',
    'JuanRa Perez': 'J. Perez',
    'Jesus Pizarro Gonzálvez': 'J. Pizarro',
    'Jesús Pizarro Gonzálvez': 'J. Pizarro',
    'Jorge Santiago Buqueras': 'J. Santiago',
    'Lucía Bernuz Culebras': 'L. Bernuz',
    'Marc Arrebola Sans': 'M. Arrebola',
    'Marc Company Salvat': 'M. Company',
    'Mario Morón Sancho': 'M. Morón',
    'Mario Morón Sacnho': 'M. Morón',
    'Nicola Perra': 'N. Perra',
    'N.Perra': 'N. Perra',
    'Santiago Jimenez Ortiz': 'S. Jimenez',
    'Sergi Pahisa Garcia': 'S. Pahisa',
    'Sergi Pahisa': 'S. Pahisa',
    'Sergi Perez Vilar': 'S. PerezVilar',
    'Victor Alvarez Moreno': 'V. Alvarez',
    'V. Alvarez': 'V. Alvarez',
    'Xavi Leiva Cañada': 'X. Leiva',
    'Chema Martínez Guillamon': 'C. Martínez',
    'Tressens Olivier': 'O. Tressens',
    'Olivier Tressens': 'O. Tressens'
};

function formatFootgolferName(fullName) {
    if (!fullName) return '';
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    if (manualMap[cleanName]) {
        return manualMap[cleanName];
    }
    // Fallback if not found
    const parts = cleanName.split(' ');
    if (parts.length <= 1) return cleanName;
    const initial = parts[0][0].toUpperCase();
    let surname = parts[1];
    if (surname) {
        surname = surname.charAt(0).toUpperCase() + surname.slice(1);
    }
    return `${initial}. ${surname}`;
}

async function main() {
    // Read the original file
    const workbook = XLSX.readFile('Hits_Footgolf_2026-07-18.xlsx');
    
    // Read sheets
    const hitsSheet = workbook.Sheets['HITS'];
    const footgolfersSheet = workbook.Sheets['FOOTGOLFERS'];
    
    const hitsData = XLSX.utils.sheet_to_json(hitsSheet);
    const footgolfersData = XLSX.utils.sheet_to_json(footgolfersSheet);
    
    // 1. Update FOOTGOLFERS names in the exact same order
    const updatedFootgolfers = footgolfersData.map(row => {
        const originalName = row['Footgolfer'];
        const formatted = formatFootgolferName(originalName);
        console.log(`Mapping: "${originalName}" -> "${formatted}"`);
        return {
            ...row,
            'Footgolfer': formatted
        };
    });
    
    // 2. Update HITS starting times starting at 5:00 PM (17:00)
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
    
    // Save
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
    const subject = `Hits Footgolf – Torneo 18/07/2026 – Registro cerrado (Nombres y Horarios Corregidos)`;
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
