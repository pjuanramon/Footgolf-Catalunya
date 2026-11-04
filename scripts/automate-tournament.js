const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
const { calcularFechaCierre } = require('../lib/stage-automation');

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
    
    function toDateStr(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    const fechaSabadoStr = toDateStr(sabado);
    const fechaDomingoStr = toDateStr(domingo);
    
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

    // Si la etapa ya está cerrada o finalizada, no volver a cerrar ni enviar hits salvo FORCE_AUTOMATION
    if (etapa.estado !== 'abierta' && !process.env.FORCE_AUTOMATION) {
        console.log(`La etapa ${etapa.nombre} ya se encuentra en estado "${etapa.estado}". No se requiere acción.`);
        return;
    }

    // Validar fecha límite de cierre oficial (por defecto miércoles 18:00 hora España)
    const fechaCierre = etapa.fecha_cierre_inscripcion 
        ? new Date(etapa.fecha_cierre_inscripcion) 
        : calcularFechaCierre(etapa);

    if (hoy < fechaCierre && !process.env.FORCE_AUTOMATION) {
        console.log(`Aún no se ha alcanzado la fecha límite de cierre (${fechaCierre.toISOString()}). El registro continúa abierto.`);
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
        .select('nombre_manual, jugador:jugadores(id, nombre_completo, nickname)')
        .eq('etapa_id', etapa.id)
        .eq('estado', 'pagada');

    if (insError) {
        console.error('Error al obtener inscritos:', insError);
        return;
    }

    // Obtener resultados de etapas anteriores para detectar debutantes (primera jornada)
    const { data: previousResults } = await supabase
        .from('resultados_etapas')
        .select('jugador_id')
        .lt('etapa_id', etapa.id);

    const veteranPlayerIds = new Set((previousResults || []).map(r => r.jugador_id));

    const playerObjs = inscritos.map(i => {
        const jId = i.jugador ? i.jugador.id : null;
        const name = (i.jugador && (i.jugador.nombre_completo || i.jugador.nickname)) || i.nombre_manual || '';
        const isDebutante = !jId || !veteranPlayerIds.has(jId);
        return {
            id: jId,
            rawName: name.trim(),
            formattedName: formatFootgolferName(name),
            isDebutante: isDebutante
        };
    }).filter(p => p.rawName !== '');

    console.log(`Jugadores inscritos: ${playerObjs.length}`);
    console.log('Debutantes detectados (nunca serán marcadores):', playerObjs.filter(p => p.isDebutante).map(p => p.formattedName));

    if (playerObjs.length === 0) {
        console.log('No hay jugadores inscritos. No se genera Excel.');
        return;
    }

    // 3. Generación del archivo Excel
    const templatePath = path.resolve(__dirname, '../Excel_ImportHitsTournamentRound983_Export-2026-04-02 09_41_53.xlsx');
    const workbook = xlsx.readFile(templatePath);

    const distribution = calculateHitDistribution(playerObjs.length);
    console.log(`Distribución de hits (menores primero):`, distribution);

    const hitGroups = [];
    const esUltimas3Etapas = etapa.id >= 10 && etapa.id <= 12;

    if (esUltimas3Etapas) {
        console.log('🏆 MODO ÚLTIMAS 3 ETAPAS ACTIVADO: Organizando salidas por competiciones y opciones matemáticas (SIN SORTEO)...');
        // Obtener última clasificación publicada antes de esta etapa
        const { data: prevStage } = await supabase
            .from('etapas')
            .select('archivo_excel')
            .lt('id', etapa.id)
            .eq('tipo', 'individual')
            .not('archivo_excel', 'is', null)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

        let absRank = [];
        let rookRank = [];
        let plataRank = [];
        if (prevStage && prevStage.archivo_excel) {
            const parsed = JSON.parse(prevStage.archivo_excel);
            absRank = (parsed.categorias && parsed.categorias['Absoluta']) || [];
            rookRank = (parsed.categorias && parsed.categorias['Rookie']) || [];
            plataRank = (parsed.categorias && parsed.categorias['Liga Plata']) || [];
        }

        const etapasRestantes = 12 - etapa.id + 1; // 3 en E10, 2 en E11, 1 en E12

        const calcMax = (entry, nBest, stageIndices) => {
            if (!entry) return 0;
            const scores = [];
            stageIndices.forEach(idx => {
                if (entry[`e${idx}`] !== undefined) scores.push(Number(entry[`e${idx}`]));
            });
            for (let k = 0; k < etapasRestantes; k++) scores.push(250);
            scores.sort((a, b) => b - a);
            return scores.slice(0, nBest).reduce((s, v) => s + v, 0);
        };

        const stageIndicesAll = Array.from({ length: etapa.id - 1 }, (_, i) => i + 1);
        const stageIndicesPlata = stageIndicesAll.filter(x => x >= 7);

        const findInCat = (catList, playerObj) => {
            const norm = playerObj.rawName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return catList.find(c => {
                const cNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return cNorm === norm || cNorm.includes(norm) || norm.includes(cNorm);
            });
        };

        // Determinar si el 1º de Absoluta ya es campeón matemático
        const firstAbs = absRank[0];
        const secondMaxAbs = absRank.slice(1).reduce((max, r) => Math.max(max, calcSlottedMax(r)), 0);
        function calcSlottedMax(r) {
            return calcMax(r, 8, stageIndicesAll);
        }
        const isFirstAbsLocked = firstAbs && (firstAbs.total > secondMaxAbs);

        // Enriquecer jugadores con sus métricas de competición
        const enriched = playerObjs.map(p => {
            const absEntry = findInCat(absRank, p);
            const rookEntry = findInCat(rookRank, p);
            const plataEntry = findInCat(plataRank, p);
            return {
                ...p,
                absPos: absEntry ? absEntry.pos : 99,
                absTotal: absEntry ? absEntry.total : 0,
                absMax: calcMax(absEntry, 8, stageIndicesAll),
                rookPos: rookEntry ? rookEntry.pos : 99,
                rookTotal: rookEntry ? rookEntry.total : 0,
                plataPos: plataEntry ? plataEntry.pos : 99,
                plataTotal: plataEntry ? plataEntry.total : 0,
                isLockedChampion: isFirstAbsLocked && absEntry && absEntry.pos === 1
            };
        });

        // Ordenar de mayor a menor prioridad competitiva (para ir llenando desde el último Hit hacia el primero):
        // 1. Contendientes al podio de Absoluta (2º y 3º puesto si el 1º ya ganó) + Top 6 Absoluta / Top 4 Rookie
        // 2. Lucha por la Primera División (Corte Top 10 Absoluta: puestos 7º al 14º) + el Campeón coronado
        // 3. Lucha por Liga Plata (contendientes principales de Plata) y Corte de 2ª División (puestos 15º al 22º)
        // 4. Resto de lucha por 2ª División y Liga Plata
        const getCompetitiveTier = (p) => {
            // Tier 4 (Va al ÚLTIMO HIT - Hit 4): Lucha directa por 2º y 3º Absoluta y Título/Podio Rookie (puestos 2 al 6 Absoluta)
            if (!p.isLockedChampion && p.absPos >= 2 && p.absPos <= 6) return 4;
            if (!p.isLockedChampion && p.absPos === 1) return 4; // Si no estuviera cerrado el 1º
            // Tier 3 (Va al Hit 3): Lucha por la 1ª División (Puestos 7 al 14 de Absoluta) + Campeón matemático si ya coronó
            if (p.isLockedChampion || (p.absPos >= 7 && p.absPos <= 14)) return 3;
            // Tier 2 (Va al Hit 2): Lucha por el Título de Liga Plata y frontera alta de 2ª División (puestos 15 al 20 Absoluta / Top 8 Plata)
            if (p.absPos >= 15 && p.absPos <= 20) return 2;
            // Tier 1 (Va al Hit 1): Asalto a 2ª División y Liga Plata (puesto 21 en adelante)
            return 1;
        };

        enriched.sort((a, b) => {
            const tierA = getCompetitiveTier(a);
            const tierB = getCompetitiveTier(b);
            if (tierA !== tierB) return tierA - tierB; // Menor tier primero (Hit 1 -> Hit 4)
            return b.absPos - a.absPos; // Dentro del mismo bloque, orden inverso de ranking para que los mejores cierren
        });

        let idx = 0;
        for (let i = 0; i < distribution.length; i++) {
            const size = distribution[i];
            const group = enriched.slice(idx, idx + size);
            // Ordenar dentro del hit por ranking absoluto ascendente para presentación limpia
            group.sort((a, b) => a.absPos - b.absPos);
            hitGroups.push(group);
            idx += size;
        }
        // En salida a tiro (Shotgun), poner los grupos estelares primero (Hoyo 1, Hoyo 2, Hoyo 3, Hoyo 4...)
        hitGroups.reverse();
    } else {
        // Jugadores designados para el último grupo (Partida estelar: Jorge Santiago, Iván Luengo, Xavi Leiva y Gustavo Verse)
        const isLastGroupVIP = (name) => {
            const lower = name.toLowerCase();
            return lower.includes('santiago') || 
                   lower.includes('luengo') || 
                   (lower.includes('xavi') && lower.includes('leiva')) || 
                   lower.includes('verse');
        };

        const lastGroupVIPs = playerObjs.filter(p => isLastGroupVIP(p.rawName));
        const otherPlayers = playerObjs.filter(p => !isLastGroupVIP(p.rawName));

        const shuffledOthers = [...otherPlayers].sort(() => Math.random() - 0.5);

        // Construir los grupos de salida
        const lastHitSize = distribution[distribution.length - 1];

        // Para el último hit: los VIPs + los que falten de los demás jugadores
        const lastHitPlayers = [...lastGroupVIPs];
        const neededForLast = lastHitSize - lastHitPlayers.length;
        for (let i = 0; i < neededForLast; i++) {
            lastHitPlayers.push(shuffledOthers.pop());
        }
        // Mezclar el último grupo para orden natural
        lastHitPlayers.sort(() => Math.random() - 0.5);

        // Para los primeros hits (del 0 al penúltimo):
        let currentIdx = 0;
        for (let i = 0; i < distribution.length - 1; i++) {
            const size = distribution[i];
            hitGroups.push(shuffledOthers.slice(currentIdx, currentIdx + size));
            currentIdx += size;
        }
        // Añadir el último grupo
        hitGroups.push(lastHitPlayers);
    }

    const hitData = [];
    const footgolferData = [];
    let currentStartTime = new Date(`${fechaTorneoStr}T14:00:00`);

    hitGroups.forEach((group, index) => {
        const hitNumber = index + 1;
        const hoyoSalida = esUltimas3Etapas ? hitNumber : 1;
        
        hitData.push({
            'Número de Hit': hitNumber,
            'Hoyo': hoyoSalida,
            'Fecha de Salida \r\n DD/MM/YYYY': formatDateDDMMYYYY(fechaTorneoDate),
            'Hora de Salida \r\n HH:mm': formatTimeHHmm(currentStartTime)
        });

        // REGLA OBLIGATORIA: Un jugador debutante NUNCA debe ser marcador/calificador
        const eligibleCalificadores = group.filter(p => !p.isDebutante);
        const pool = eligibleCalificadores.length > 0 ? eligibleCalificadores : group;
        const chosenCalificador = pool[Math.floor(Math.random() * pool.length)];

        group.forEach(p => {
            footgolferData.push({
                'Número de Hit': hitNumber,
                'Footgolfer': p.formattedName,
                '¿Es Calificador? \r\n 1=Sí \r\n 0=No': (p === chosenCalificador) ? 1 : 0
            });
        });

        if (!esUltimas3Etapas) {
            currentStartTime.setMinutes(currentStartTime.getMinutes() + 7);
        }
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
        'Eduardo martin rodriguez': 'E. MartinRdz',
        'Alexis Correa': 'A. Correa',
        'Gustavo Alejandro Verse': 'G. Verse',
        'Marco Ferrari': 'M. Ferrari',
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
    const lowerKey = Object.keys(manualMap).find(k => k.toLowerCase() === cleanName.toLowerCase());
    if (lowerKey) {
        return manualMap[lowerKey];
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
