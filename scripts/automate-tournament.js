const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Configuración cargada via node --env-file=.env o manualmente
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

async function runAutomation() {
    console.log(`--- [${new Date().toISOString()}] Iniciando validación de torneo ---`);

    // 1. Detección del torneo
    const hoy = new Date();
    
    // Calculamos el sábado y domingo más cercanos de este fin de semana
    const sabado = new Date(hoy);
    sabado.setDate(hoy.getDate() + (6 - hoy.getDay() + 7) % 7);
    
    const domingo = new Date(hoy);
    domingo.setDate(hoy.getDate() + (7 - hoy.getDay() + 7) % 7);
    
    const fechaSabadoStr = sabado.toISOString().split('T')[0];
    const fechaDomingoStr = domingo.toISOString().split('T')[0];
    
    console.log(`Buscando torneo para el fin de semana: Sábado ${fechaSabadoStr} o Domingo ${fechaDomingoStr}`);

    const { data: etapa, error: etapaError } = await supabase
        .from('etapas')
        .select('*')
        .in('fecha', [fechaSabadoStr, fechaDomingoStr])
        .order('fecha', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (etapaError || !etapa) {
        console.log(`No hay torneo programado para este fin de semana (${fechaSabadoStr} / ${fechaDomingoStr}). Finalizando.`);
        return;
    }

    console.log(`Torneo detectado: ${etapa.nombre} (${etapa.fecha})`);

    // Validar si hoy es viernes
    if (hoy.getDay() !== 5 && !process.env.FORCE_AUTOMATION) {
        console.log(`Hoy no es viernes (es día ${hoy.getDay()}).`);
        return;
    }

    console.log(`¡Iniciando cierre y generación de hits para el torneo del ${etapa.fecha}!`);

    const fechaTorneoDate = new Date(etapa.fecha + 'T12:00:00');
    const fechaTorneoStr = etapa.fecha;

    // 2. Cierre automático de inscripciones
    const { error: updateError } = await supabase
        .from('etapas')
        .update({ estado: 'cerrada' })
        .eq('id', etapa.id);

    if (updateError) {
        console.error('Error al cerrar inscripciones:', updateError);
        return;
    }
    console.log(`Estado de la etapa ${etapa.id} cambiado a "cerrada".`);

    // Obtener jugadores inscritos (solo pagados)
    const { data: inscritos, error: insError } = await supabase
        .from('inscripciones')
        .select('jugador:jugadores(nombre_completo)')
        .eq('etapa_id', etapa.id)
        .eq('estado', 'pagada');

    if (insError) {
        console.error('Error al obtener inscritos:', insError);
        return;
    }

    const jugadoresArr = inscritos.map(i => i.jugador.nombre_completo).filter(n => n);
    console.log(`Jugadores inscritos: ${jugadoresArr.length}`);

    if (jugadoresArr.length === 0) {
        console.log('No hay jugadores inscritos. No se genera Excel.');
        return;
    }

    // 3. Generación del archivo Excel
    const templatePath = path.resolve(__dirname, '../Excel_ImportHitsTournamentRound983_Export-2026-04-02 09_41_53.xlsx');
    const workbook = xlsx.readFile(templatePath);
    
    // Aleatorizar jugadores de la base de datos
    const players = [...jugadoresArr].sort(() => Math.random() - 0.5);
    const distribution = calculateHitDistribution(players.length);
    console.log(`Distribución de hits (menores primero):`, distribution);

    const hitData = [];
    const footgolferData = [];
    let playerIndex = 0;
    let currentStartTime = new Date(`${fechaTorneoStr}T17:00:00`);

    distribution.forEach((size, index) => {
        const hitNumber = index + 1;
        
        hitData.push({
            'Número de Hit': hitNumber,
            'Hoyo': 1,
            'Fecha de Salida \r\n DD/MM/YYYY': formatDateDDMMYYYY(fechaTorneoDate),
            'Hora de Salida \r\n HH:mm': formatTimeHHmm(currentStartTime)
        });

        const hitPlayers = players.slice(playerIndex, playerIndex + size);
        // Designar 1 calificador aleatorio por hit
        const caliIdx = Math.floor(Math.random() * size);
        
        hitPlayers.forEach((playerName, pIdx) => {
            footgolferData.push({
                'Número de Hit': hitNumber,
                'Footgolfer': formatFootgolferName(playerName),
                '¿Es Calificador? \r\n 1=Sí \r\n 0=No': pIdx === caliIdx ? 1 : 0
            });
        });
        
        playerIndex += size;
        currentStartTime.setMinutes(currentStartTime.getMinutes() + 7);
    });

    workbook.Sheets['HITS'] = xlsx.utils.json_to_sheet(hitData);
    workbook.Sheets['FOOTGOLFERS'] = xlsx.utils.json_to_sheet(footgolferData);

    const outputFileName = `Hits_Footgolf_${fechaTorneoStr}.xlsx`;
    const outputPath = path.resolve(__dirname, `../${outputFileName}`);
    xlsx.writeFile(workbook, outputPath);
    console.log(`Archivo Excel generado: ${outputFileName}`);

    // 6. Envío automático (Intentando uno por uno para evitar bloqueos de Resend Mode Onboarding)
    const subject = `Hits Footgolf – Torneo ${formatDateDDMMYYYY(fechaTorneoDate)} – Registro cerrado`;
    const recipients = ['pjuanramon@hotmail.com', 'jorge.s.b@hotmail.com'];
    
    for (const email of recipients) {
        console.log(`Intentando enviar a: ${email}...`);
        try {
            const { data, error } = await resend.emails.send({
                from: 'onboarding@resend.dev',
                to: [email],
                subject: subject,
                html: `<p>Se adjuntan los hits para el torneo.</p>`,
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
}

function calculateHitDistribution(n) {
    if (n === 0) return [];
    if (n < 3) return [n]; 
    
    let bestDist = null;
    let minThrees = Infinity;
    let maxFoursAndFives = -1;

    for (let z = 0; z <= n; z++) { // z representa grupos de 3
        for (let y = 0; y <= Math.floor(n / 4); y++) { // y representa grupos de 4
            let remaining = n - (z * 3) - (y * 4);
            if (remaining >= 0 && remaining % 5 === 0) {
                let x = remaining / 5; // x representa grupos de 5
                
                // Queremos minimizar los grupos de 3 (z)
                if (z < minThrees) {
                    minThrees = z;
                    let currentDist = [];
                    for(let i=0; i<x; i++) currentDist.push(5);
                    for(let i=0; i<y; i++) currentDist.push(4);
                    for(let i=0; i<z; i++) currentDist.push(3);
                    bestDist = currentDist;
                }
            }
        }
    }
    
    if (!bestDist) {
        let dist = []; let rem = n;
        while (rem >= 5) { dist.push(5); rem -= 5; }
        if (rem > 0) dist.push(rem);
        return dist.sort((a,b) => a-b);
    }
    return bestDist.sort((a, b) => a - b);
}

function formatDateDDMMYYYY(date) {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function formatTimeHHmm(date) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function formatFootgolferName(fullName) {
    if (!fullName) return '';
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    
    // Hardcoded maps/exceptions to ensure 100% correct formatting for existing players
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
        'Chema Martínez Guillamon': 'C. Guillamon',
        'Tressens Olivier': 'O. Tressens',
        'Olivier Tressens': 'O. Tressens'
    };
    
    if (manualMap[cleanName]) {
        return manualMap[cleanName];
    }
    
    // Fallback automatic formatting
    const parts = cleanName.split(' ');
    if (parts.length <= 1) return cleanName;
    
    const initial = parts[0][0].toUpperCase();
    
    // Check if the second word is a known middle name/second first name to skip to the third word for the surname
    const secondWordsToSkip = ['ramon', 'ramón', 'alejandro', 'manuel', 'jose', 'josé', 'maria', 'maría', 'carlos', 'javier', 'miguel', 'antonio', 'angel', 'ángel'];
    let surnameIndex = 1;
    if (parts.length > 2 && secondWordsToSkip.includes(parts[1].toLowerCase())) {
        surnameIndex = 2;
    }
    
    let surname = parts[surnameIndex];
    if (surname) {
        surname = surname.charAt(0).toUpperCase() + surname.slice(1);
    }
    
    return `${initial}. ${surname}`;
}

runAutomation().catch(console.error);
