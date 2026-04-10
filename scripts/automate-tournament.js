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
    const diasHastaDomingo = (7 - hoy.getDay()) % 7;
    const proximoDomingo = new Date(hoy);
    proximoDomingo.setDate(hoy.getDate() + (diasHastaDomingo === 0 ? 0 : diasHastaDomingo));
    
    const fechaBusquedaStr = proximoDomingo.toISOString().split('T')[0];
    console.log(`Buscando torneo para el domingo: ${fechaBusquedaStr}`);

    const { data: etapa, error: etapaError } = await supabase
        .from('etapas')
        .select('*')
        .eq('fecha', fechaBusquedaStr)
        .single();

    if (etapaError || !etapa) {
        console.log(`No hay torneo programado para el domingo ${fechaBusquedaStr}. Finalizando.`);
        return;
    }

    console.log(`Torneo detectado: ${etapa.nombre} (${etapa.fecha})`);

    // Validar si hoy es viernes
    if (hoy.getDay() !== 5) {
        console.log(`Hoy no es viernes (es día ${hoy.getDay()}).`);
        return;
    }

    console.log(`¡Es viernes previo al torneo! Iniciando cierre y generación de hits.`);

    const proximoDomingoDate = new Date(etapa.fecha + 'T12:00:00');
    const fechaDomingoStr = etapa.fecha;

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
        .select('jugador:jugadores(nickname)')
        .eq('etapa_id', etapa.id)
        .eq('estado', 'pagada');

    if (insError) {
        console.error('Error al obtener inscritos:', insError);
        return;
    }

    const jugadoresArr = inscritos.map(i => i.jugador.nickname).filter(n => n);
    console.log(`Jugadores inscritos: ${jugadoresArr.length}`);

    if (jugadoresArr.length === 0) {
        console.log('No hay jugadores inscritos. No se genera Excel.');
        return;
    }

    // 3. Generación del archivo Excel
    const templatePath = path.resolve(__dirname, '../Excel_ImportHitsTournamentRound983_Export-2026-04-02 09_41_53.xlsx');
    const workbook = xlsx.readFile(templatePath);
    
    const players = [...jugadoresArr];
    for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
    }

    const distribution = calculateHitDistribution(players.length);
    const hitData = [];
    const footgolferData = [];
    let playerIndex = 0;
    let currentStartTime = new Date(`${fechaDomingoStr}T14:00:00`);

    distribution.forEach((size, index) => {
        const hitNumber = index + 1;
        hitData.push({
            'Número de Hit': hitNumber,
            'Hoyo': 1,
            'Fecha de Salida \r\n DD/MM/YYYY': formatDateDDMMYYYY(proximoDomingoDate),
            'Hora de Salida \r\n HH:mm': formatTimeHHmm(currentStartTime)
        });
        const hitPlayers = players.slice(playerIndex, playerIndex + size);
        const caliIdx = Math.floor(Math.random() * size);
        hitPlayers.forEach((p, pIdx) => {
            footgolferData.push({
                'Número de Hit': hitNumber,
                'Footgolfer': p,
                '¿Es Calificador? \r\n 1=Sí \r\n 0=No': (pIdx === caliIdx ? 1 : 0)
            });
        });
        playerIndex += size;
        currentStartTime.setMinutes(currentStartTime.getMinutes() + 7);
    });

    workbook.Sheets['HITS'] = xlsx.utils.json_to_sheet(hitData);
    workbook.Sheets['FOOTGOLFERS'] = xlsx.utils.json_to_sheet(footgolferData);

    const outputFileName = `Hits_Footgolf_${fechaDomingoStr}.xlsx`;
    const outputPath = path.resolve(__dirname, `../${outputFileName}`);
    xlsx.writeFile(workbook, outputPath);
    console.log(`Archivo Excel generado: ${outputFileName}`);

    // 6. Envío automático (Intentando uno por uno para evitar bloqueos de Resend Mode Onboarding)
    const subject = `Hits Footgolf – Torneo ${formatDateDDMMYYYY(proximoDomingoDate)} – Registro cerrado`;
    const recipients = ['pjuanramon@hotmail.com', 'jorge.s.b@hotmail.com'];
    
    for (const email of recipients) {
        console.log(`Intentando enviar a: ${email}...`);
        try {
            const { data, error } = await resend.emails.send({
                from: 'onboarding@resend.dev',
                to: [email],
                subject: subject,
                html: `<p>Se adjuntan los hits para el torneo del domingo.</p>`,
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
    for (let z = 0; z <= 2; z++) {
        for (let y = 0; y <= Math.floor(n / 4); y++) {
            let remaining = n - (z * 3) - (y * 4);
            if (remaining >= 0 && remaining % 5 === 0) {
                let x = remaining / 5;
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

runAutomation().catch(console.error);
