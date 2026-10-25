const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

// Manual map for footgolfers
const manualMap = {
    'Alberto Leiva cañada': 'A. Leiva',
    'Alberto Salazar Fernández': 'A. Salazar',
    'Daniel Abril Amador': 'D. Abril',
    'David Rojo Dengra': 'D. Rojo',
    'Eduardo Martin Rodriguez': 'E. MartinRdz',
    'Eduardo martin rodriguez': 'E. MartinRdz',
    'Erik Matarrubia Galera': 'E. Matarrubia',
    'Gastón Masuck Cardozo': 'G. Masuck',
    'Ivan luengo robles': 'I. Luengo',
    'Jordi Martin Garcia': 'J. MartínGcia',
    'J.Montesinos': 'J. Montesinos',
    'Joan Montesinos': 'J. Montesinos',
    'Jordi Ortega López': 'J. Ortega',
    'JuanRa Perez': 'J. Perez',
    'Jesús Pizarro Gonzálvez': 'J. Pizarro',
    'Jorge Santiago Buqueras': 'J. Santiago',
    'Mario Morón Sancho': 'M. Morón',
    'Santiago Jimenez Ortiz': 'S. Jimenez',
    'Sergi Pahisa': 'S. Pahisa',
    'V. Alvarez': 'V. Alvarez',
    'Xavi Leiva Cañada': 'X. Leiva',
    'Chema Martínez Guillamon': 'C. Guillamon',
    'Gustavo Verse': 'G. Verse'
};

function formatFootgolferName(fullName) {
    if (!fullName) return '';
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    if (manualMap[cleanName]) {
        return manualMap[cleanName];
    }
    const parts = cleanName.split(' ');
    if (parts.length <= 1) return cleanName;
    const initial = parts[0][0].toUpperCase();
    const surname = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    return `${initial}. ${surname}`;
}

const players = [
    "Jorge Santiago Buqueras",
    "Daniel Abril Amador",
    "V. Alvarez",
    "Eduardo Martin Rodriguez",
    "Santiago Jimenez Ortiz",
    "Mario Morón Sancho",
    "Jordi Martin Garcia",
    "Ivan luengo robles",
    "Alberto Leiva cañada",
    "Xavi Leiva Cañada",
    "Sergi Pahisa",
    "Chema Martínez Guillamon",
    "J.Montesinos",
    "Gustavo Verse",
    "Alberto Salazar Fernández",
    "Gastón Masuck Cardozo",
    "David Rojo Dengra",
    "Jordi Ortega López",
    "Erik Matarrubia Galera",
    "Jesús Pizarro Gonzálvez",
    "JuanRa Perez"
];

// 21 players -> 5 hits: sizes 5, 4, 4, 4, 4
// Hit 1 (Hoyo 1): 5 jugadores (el grupo de 5 sale del Hoyo 1)
// Hit 2 (Hoyo 2): 4 jugadores
// Hit 3 (Hoyo 3): 4 jugadores
// Hit 4 (Hoyo 4): 4 jugadores
// Hit 5 (Hoyo 5): 4 jugadores (incluye a J. Perez)
const distribution = [5, 4, 4, 4, 4];
const holes = [1, 2, 3, 4, 5];

const hitData = [];
const footgolferData = [];
let playerIndex = 0;

distribution.forEach((size, index) => {
    const hitNumber = index + 1;
    const holeNumber = holes[index];
    
    // Todos salen a las 17:00 por indicación del usuario, hoyos 1, 2, 3, 4, 5
    hitData.push({
        'Número de Hit': hitNumber,
        'Hoyo': holeNumber,
        'Fecha de Salida \r\n DD/MM/YYYY': '01/08/2026',
        'Hora de Salida \r\n HH:mm': '17:00'
    });

    const hitPlayers = players.slice(playerIndex, playerIndex + size);
    // Designar 1 calificador por hit
    const caliIdx = 0; // Primer jugador de cada hit como calificador
    
    hitPlayers.forEach((playerName, pIdx) => {
        footgolferData.push({
            'Número de Hit': hitNumber,
            'Footgolfer': formatFootgolferName(playerName),
            '¿Es Calificador? \r\n 1=Sí \r\n 0=No': pIdx === caliIdx ? 1 : 0
        });
    });
    
    playerIndex += size;
});

const templatePath = path.resolve(__dirname, '../Excel_ImportHitsTournamentRound983_Export-2026-04-02 09_41_53.xlsx');
const workbook = xlsx.readFile(templatePath);

workbook.Sheets['HITS'] = xlsx.utils.json_to_sheet(hitData);
workbook.Sheets['FOOTGOLFERS'] = xlsx.utils.json_to_sheet(footgolferData);

const outputFileName = `Hits_Footgolf_2026-08-01.xlsx`;
const outputPath = path.resolve(__dirname, `../${outputFileName}`);
xlsx.writeFile(workbook, outputPath);
console.log(`✅ Archivo Excel generado: ${outputFileName} con ${players.length} jugadores.`);

// Enviar por email si está configurado Resend
if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const recipients = ['pjuanramon@hotmail.com', 'jorge.s.b@hotmail.com'];
    
    (async () => {
        for (const email of recipients) {
            console.log(`Intentando enviar a: ${email}...`);
            try {
                const { data, error } = await resend.emails.send({
                    from: 'onboarding@resend.dev',
                    to: [email],
                    subject: `Hits Footgolf – Etapa 8 (01/08/2026) – Grupo de 5 en Hoyo 1`,
                    html: `<p>Hola,</p><p>Se adjuntan los hits actualizados para la Etapa 8 (01/08/2026). El grupo de 5 jugadores sale del Hoyo 1 y los demás grupos (de 4 jugadores) salen sucesivamente de los hoyos 2, 3, 4 y 5. Todos a las 17:00.</p>`,
                    attachments: [{ filename: outputFileName, content: fs.readFileSync(outputPath) }]
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
    })();
}
