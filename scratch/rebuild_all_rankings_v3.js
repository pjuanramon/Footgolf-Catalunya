const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const { matchPlayerToDb } = require('../lib/matching');
const { calcularPuntosEtapa, calcularClasificacionGeneral } = require('../lib/ranking-engine');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const HISTORICAL = {
    masculino: [
        { name: "Jorge Santiago Buqueras", e1: 250, e2: 250 },
        { name: "Sergi Pahisa", e1: 200, e2: 230 },
        { name: "Xavi Leiva Cañada", e1: 230, e2: 190 },
        { name: "Olivier TRESSENS", e1: 190, e2: 215 },
        { name: "Chema Martínez Guillamon", e1: 215, e2: 165 },
        { name: "JuanRa Perez", e1: 180, e2: 180 },
        { name: "Alberto Leiva cañada", e1: 170, e2: 120 },
        { name: "Mario Morón Sancho", e1: 125, e2: 130 },
        { name: "ivan luengo robles", e1: 105, e2: 150 },
        { name: "Daniel Abril Amador", e1: 85, e2: 165 },
        { name: "Raúl Linares Ramos", e1: 105, e2: 140 },
        { name: "David Tellez Viana", e1: 145, e2: 80 },
        { name: "Eduardo Martin Rodriguez", e1: 0, e2: 200 },
        { name: "Fernando Martínez Guillamón", e1: 90, e2: 100 },
        { name: "Gustavo Verse", e1: 95, e2: 85 },
        { name: "Sergi Perez Vilar", e1: 160, e2: 0 },
        { name: "Nicola Perra", e1: 145, e2: 0 },
        { name: "Juan Medina", e1: 75, e2: 62 },
        { name: "Luca Rubinacci", e1: 70, e2: 66 },
        { name: "Gastón Masuck Cardozo", e1: 125, e2: 0 },
        { name: "David Linares Ramos", e1: 0, e2: 110 },
        { name: "Marc Company Salvat", e1: 0, e2: 92 },
        { name: "Erik Mata", e1: 0, e2: 92 },
        { name: "Jesús Pizarro Gonzálvez", e1: 80, e2: 0 },
        { name: "Jordi Ortega López", e1: 0, e2: 75 },
        { name: "Giacomo Bonacini", e1: 0, e2: 70 }
    ],
    rookie: [
        { name: "Sergi Pahisa", e1: 230, e2: 250 },
        { name: "Xavi Leiva Cañada", e1: 250, e2: 215 },
        { name: "Alberto Leiva cañada", e1: 215, e2: 160 },
        { name: "Mario Morón Sancho", e1: 185, e2: 170 },
        { name: "ivan luengo robles", e1: 165, e2: 190 },
        { name: "Raúl Linares Ramos", e1: 165, e2: 180 },
        { name: "Daniel Abril Amador", e1: 140, e2: 200 },
        { name: "David Tellez Viana", e1: 200, e2: 120 },
        { name: "Gustavo Verse", e1: 150, e2: 130 },
        { name: "Eduardo Martin Rodriguez", e1: 0, e2: 230 },
        { name: "Juan Medina", e1: 130, e2: 95 },
        { name: "Luca Rubinacci", e1: 120, e2: 100 },
        { name: "Gastón Masuck Cardozo", e1: 185, e2: 0 },
        { name: "Marc Company Salvat", e1: 0, e2: 145 },
        { name: "Erik Mata", e1: 0, e2: 145 },
        { name: "Jordi Ortega López", e1: 0, e2: 110 }
    ]
};

const NAME_OVERRIDES = {
    "erik matarrubia": "Erik Matarrubia Galera"
};

function parseScoresFromSheet(rows, dbPlayers, label) {
    const resultadosBrutos = [];
    
    for (const row of rows) {
        let rawName = String(row['D'] || '').trim();
        if (!rawName) continue;
        
        // Skip explicitly marked as not played
        if (String(row['F']).trim().toUpperCase() === 'NO') continue;
        
        // Calculate strokes sum from G to X
        const holeKeys = ['G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X'];
        let strokesSum = 0;
        let validHoles = 0;
        holeKeys.forEach(k => {
            const val = Number(row[k]);
            if (!isNaN(val) && row[k] !== '') {
                strokesSum += val;
                validHoles++;
            }
        });
        
        // Skip if they didn't complete the holes
        if (validHoles < 18 || strokesSum === 0) continue;
        
        // Calculate score relative to course par (71)
        const score = strokesSum - 71;
        
        // Check for manual matching overrides
        const normName = rawName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        for (const [key, target] of Object.entries(NAME_OVERRIDES)) {
            if (normName.includes(key)) {
                rawName = target;
                break;
            }
        }
        
        const match = matchPlayerToDb(rawName, dbPlayers);
        
        if (match.player) {
            resultadosBrutos.push({
                rawName,
                score,
                dbPlayer: match.player
            });
        } else {
            console.warn(`⚠️ [${label}] No se pudo emparejar al jugador: "${rawName}" (Score calculado: ${score})`);
        }
    }
    
    return resultadosBrutos;
}

async function rebuild() {
    console.log('🧹 Limpiando resultados anteriores...');
    await supabase.from('resultados_etapas').delete().gt('etapa_id', 0);
    console.log('✅ Base de datos limpia de resultados.');

    // 1. Obtener jugadores de la DB
    const { data: dbPlayers } = await supabase.from('jugadores').select('*');
    
    // 2. Procesar E1 y E2 (Histórico)
    console.log('⏳ Procesando Etapa 1 y Etapa 2 (Histórico)...');
    const mapResultados = new Map(); // player_id -> { e1: { abs, rook }, e2: { abs, rook } }
    const processHistoricalCat = (cat, field) => {
        HISTORICAL[cat].forEach(p => {
            const match = matchPlayerToDb(p.name, dbPlayers);
            if (match.player) {
                const id = match.player.id;
                if (!mapResultados.has(id)) mapResultados.set(id, { e1: {}, e2: {} });
                if (p.e1 > 0) mapResultados.get(id).e1[field] = p.e1;
                if (p.e2 > 0) mapResultados.get(id).e2[field] = p.e2;
            }
        });
    };
    processHistoricalCat('masculino', 'absoluta');
    processHistoricalCat('rookie', 'rookie');

    for (const [id, data] of mapResultados.entries()) {
        if (data.e1.absoluta || data.e1.rookie) {
            await supabase.from('resultados_etapas').upsert({ 
                etapa_id: 1, 
                jugador_id: id, 
                puntos_absoluta: data.e1.absoluta || 0, 
                puntos_rookie: data.e1.rookie || 0 
            }, { onConflict: 'etapa_id, jugador_id' });
        }
        if (data.e2.absoluta || data.e2.rookie) {
            await supabase.from('resultados_etapas').upsert({ 
                etapa_id: 2, 
                jugador_id: id, 
                puntos_absoluta: data.e2.absoluta || 0, 
                puntos_rookie: data.e2.rookie || 0 
            }, { onConflict: 'etapa_id, jugador_id' });
        }
    }
    console.log('✅ E1 y E2 insertados en resultados_etapas.');

    // 3. Procesar E3 (Excel crudo del usuario)
    console.log('⏳ Procesando Etapa 3...');
    const excelPathE3 = path.join(__dirname, '../Resultados_Torneos/Tournament Report from 3a Jornada Liga Catalana generated -2026-05-31 05_11_53.xlsx');
    const workbookE3 = XLSX.readFile(excelPathE3);
    const sheetE3 = workbookE3.Sheets[workbookE3.SheetNames[0]];
    const rowsE3 = XLSX.utils.sheet_to_json(sheetE3, { header: 'A', defval: '' }).slice(1);
    
    // Desempates conocidos de la Etapa 3
    const desempatesE3 = {
        '01a0156e-0161-4415-a37a-1395d958ad26': true, // Jorge Santiago Buqueras ganó su desempate contra Eduardo
        'c7433e20-2615-4396-880d-f0a76c5c081d': true  // Ivan luengo robles ganó su desempate Rookie
    };

    const resultadosBrutosE3 = parseScoresFromSheet(rowsE3, dbPlayers, 'Etapa 3');
    
    // Asignar estado de desempate
    resultadosBrutosE3.forEach(r => {
        if (desempatesE3[r.dbPlayer.id]) {
            r.wonTie = true;
        }
    });

    console.log(`✅ Procesados ${resultadosBrutosE3.length} jugadores válidos en Etapa 3.`);

    const puntosE3 = calcularPuntosEtapa(resultadosBrutosE3);
    for (const r of puntosE3) {
        const abs = r.puntos['Absoluta'] !== undefined ? Math.round(r.puntos['Absoluta'] * 10) / 10 : 0;
        const rook = r.puntos['Rookie'] !== undefined ? Math.round(r.puntos['Rookie'] * 10) / 10 : 0;
        const s45 = r.puntos['Senior 45 +'] !== undefined ? Math.round(r.puntos['Senior 45 +'] * 10) / 10 : 0;
        const s55 = r.puntos['Senior 55 +'] !== undefined ? Math.round(r.puntos['Senior 55 +'] * 10) / 10 : 0;
        const fem = r.puntos['Damas'] !== undefined ? Math.round(r.puntos['Damas'] * 10) / 10 : 0;

        const { error } = await supabase.from('resultados_etapas').upsert({
            etapa_id: 3, 
            jugador_id: r.jugador_id, 
            puntos_absoluta: abs,
            puntos_rookie: rook, 
            puntos_senior45: s45,
            puntos_senior55: s55, 
            puntos_femenino: fem,
            score: r.score
        }, { onConflict: 'etapa_id, jugador_id' });
        
        if (error) {
            console.error(`❌ Error al insertar E3 para ${r.nickname}:`, error.message);
            throw error;
        }
    }
    console.log('✅ E3 calculada e insertada en resultados_etapas.');

    // 4. Procesar E4 (Excel crudo del usuario)
    console.log('⏳ Procesando Etapa 4...');
    const excelPathE4 = path.join(__dirname, '../Resultados_Torneos/Tournament Report from 4a Jornada Liga Catalana generated -2026-05-31 05_11_33.xlsx');
    const workbookE4 = XLSX.readFile(excelPathE4);
    const sheetE4 = workbookE4.Sheets[workbookE4.SheetNames[0]];
    const rowsE4 = XLSX.utils.sheet_to_json(sheetE4, { header: 'A', defval: '' }).slice(1);
    
    // Desempates conocidos de la Etapa 4
    const desempatesE4 = {
        '623e8adf-1b33-430c-8ee1-c1363b660f08': true, // Alberto Salazar ganó su desempate Absoluta
        'ee777b16-855b-486a-b49e-4a2c3c83abad': true  // Sergi Pahisa ganó su desempate Rookie
    };

    const resultadosBrutosE4 = parseScoresFromSheet(rowsE4, dbPlayers, 'Etapa 4');
    
    // Asignar estado de desempate
    resultadosBrutosE4.forEach(r => {
        if (desempatesE4[r.dbPlayer.id]) {
            r.wonTie = true;
        }
    });

    console.log(`✅ Procesados ${resultadosBrutosE4.length} jugadores válidos en Etapa 4.`);

    const puntosE4 = calcularPuntosEtapa(resultadosBrutosE4);
    for (const r of puntosE4) {
        const abs = r.puntos['Absoluta'] !== undefined ? Math.round(r.puntos['Absoluta'] * 10) / 10 : 0;
        const rook = r.puntos['Rookie'] !== undefined ? Math.round(r.puntos['Rookie'] * 10) / 10 : 0;
        const s45 = r.puntos['Senior 45 +'] !== undefined ? Math.round(r.puntos['Senior 45 +'] * 10) / 10 : 0;
        const s55 = r.puntos['Senior 55 +'] !== undefined ? Math.round(r.puntos['Senior 55 +'] * 10) / 10 : 0;
        const fem = r.puntos['Damas'] !== undefined ? Math.round(r.puntos['Damas'] * 10) / 10 : 0;

        const { error } = await supabase.from('resultados_etapas').upsert({
            etapa_id: 4, 
            jugador_id: r.jugador_id, 
            puntos_absoluta: abs,
            puntos_rookie: rook, 
            puntos_senior45: s45,
            puntos_senior55: s55, 
            puntos_femenino: fem,
            score: r.score
        }, { onConflict: 'etapa_id, jugador_id' });
        
        if (error) {
            console.error(`❌ Error al insertar E4 para ${r.nickname}:`, error.message);
            throw error;
        }
    }
    console.log('✅ E4 calculada e insertada en resultados_etapas.');

    // 5. Generar snapshots finales actualizados para E1, E2, E3, y E4
    console.log('⏳ Generando y guardando JSONs acumulados en etapas...');
    const { data: todos } = await supabase.from('resultados_etapas').select('*, jugadores(nickname)').order('etapa_id', { ascending: true });

    const generateSnapshot = (hastaJornada) => {
        const resultadosHasta = todos.filter(r => r.etapa_id <= hastaJornada);
        const general = calcularClasificacionGeneral(resultadosHasta);
        
        const categoriasFinal = { 'Absoluta': [], 'Rookie': [], 'Senior 45 +': [], 'Senior 55 +': [], 'Damas': [], 'Junior': [] };
        
        Object.keys(categoriasFinal).forEach(cat => {
            const rank = general.map(j => {
                const c = j.categorias[cat] || { total: 0, etapas: [] };
                
                const returnObj = { 
                    name: j.nickname, 
                    total: Math.round(c.total * 10) / 10,
                    pos: 0 
                };

                for (let i = 1; i <= hastaJornada; i++) {
                    if (c[`e${i}`] !== undefined) {
                        returnObj[`e${i}`] = Math.round(c[`e${i}`] * 10) / 10;
                    }
                }

                return returnObj;
            }).filter(j => j.total > 0).sort((a, b) => b.total - a.total);
            
            rank.forEach((p, i) => p.pos = i + 1);
            categoriasFinal[cat] = rank;
        });

        return { 
            jornada: hastaJornada, 
            ultima_actualizacion: new Date().toISOString(), 
            categorias: categoriasFinal 
        };
    };

    await supabase.from('etapas').update({ archivo_excel: JSON.stringify(generateSnapshot(1)) }).eq('id', 1);
    await supabase.from('etapas').update({ archivo_excel: JSON.stringify(generateSnapshot(2)) }).eq('id', 2);
    await supabase.from('etapas').update({ archivo_excel: JSON.stringify(generateSnapshot(3)) }).eq('id', 3);
    await supabase.from('etapas').update({ archivo_excel: JSON.stringify(generateSnapshot(4)) }).eq('id', 4);

    console.log('🎉 ¡Snapshots de clasificación y resultados recalculados y guardados con éxito para E1, E2, E3, y E4!');
    
    // Imprimir el caso específico de Jordi Ortega López para validar
    console.log('\n=== VALIDACIÓN: JORDI ORTEGA LÓPEZ ===');
    const { data: resJordi } = await supabase.from('resultados_etapas')
        .select('*, jugadores(nickname)')
        .eq('jugador_id', '4fd9476e-3d59-421a-82a2-f09c2a77f4e7')
        .order('etapa_id', { ascending: true });
        
    resJordi.forEach(r => {
        console.log(`Etapa ${r.etapa_id} | Score: ${r.score} | Puntos Absoluta: ${r.puntos_absoluta} | Puntos Rookie: ${r.puntos_rookie}`);
    });
}

rebuild().catch(console.error);
