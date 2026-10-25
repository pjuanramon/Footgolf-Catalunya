const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
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
    ],
    senior45: [
        { name: "Gustavo Verse", e1: 250, e2: 250 }
    ],
    senior55: [
        { name: "Gustavo Verse", e1: 250, e2: 250 }
    ]
};

function parseSingleRoundExcel(filePath, dbPlayers, desempates = {}, par = 71) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' }).slice(1);
    
    const resultadosBrutos = [];
    for (const row of rows) {
        let rawName = String(row['D'] || '').trim();
        if (!rawName) continue;
        if (String(row['F']).trim().toUpperCase() === 'NO') continue;

        // Holes G to X
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

        if (validHoles < 18 || strokesSum === 0) continue;
        const score = strokesSum - par;

        // Manual matching overrides
        if (rawName.toLowerCase().includes('matarrubia')) rawName = 'Erik Matarrubia Galera';
        if (rawName.toLowerCase().includes('alvarez')) rawName = 'Victor Alvarez Moreno';
        if (rawName.toLowerCase().includes('salazar')) rawName = 'Alberto Salazar Fernández';
        if (rawName.toLowerCase().includes('abril')) rawName = 'Daniel Abril Amador';

        const match = matchPlayerToDb(rawName, dbPlayers);
        if (match.player) {
            // Pol Santoro no tiene licencia
            if (match.player.id === '7735029f-ef93-4dbc-9a55-907651401567') continue;

            const wonTie = !!(desempates && desempates[match.player.id]);
            resultadosBrutos.push({
                rawName,
                score,
                wonTie,
                dbPlayer: match.player
            });
        } else {
            console.warn(`⚠️ Jugador no matcheado en ${filePath}: ${rawName}`);
        }
    }
    return resultadosBrutos;
}

async function rebuildAll() {
    console.log('--- RECONSTRUYENDO RESULTADOS Y CLASIFICACIONES DE ETAPAS 1 A 8 ---');

    // 1. Obtener jugadores
    const { data: dbPlayers, error: errPlayers } = await supabase.from('jugadores').select('*');
    if (errPlayers) throw errPlayers;

    // 2. Limpiar resultados_etapas
    console.log('🧹 Limpiando tabla resultados_etapas...');
    await supabase.from('resultados_etapas').delete().gt('etapa_id', 0);

    // 3. Insertar Etapa 1 y 2
    console.log('⏳ Insertando Etapa 1 y Etapa 2...');
    const mapE1E2 = new Map();
    const processCat = (cat, field) => {
        (HISTORICAL[cat] || []).forEach(p => {
            const match = matchPlayerToDb(p.name, dbPlayers);
            if (match.player) {
                const id = match.player.id;
                if (!mapE1E2.has(id)) mapE1E2.set(id, { e1: {}, e2: {} });
                if (p.e1 > 0) mapE1E2.get(id).e1[field] = p.e1;
                if (p.e2 > 0) mapE1E2.get(id).e2[field] = p.e2;
            }
        });
    };
    processCat('masculino', 'puntos_absoluta');
    processCat('rookie', 'puntos_rookie');
    processCat('senior45', 'puntos_senior45');
    processCat('senior55', 'puntos_senior55');

    for (const [id, data] of mapE1E2.entries()) {
        if (Object.keys(data.e1).length > 0) {
            await supabase.from('resultados_etapas').insert({
                etapa_id: 1,
                jugador_id: id,
                puntos_absoluta: data.e1.puntos_absoluta || 0,
                puntos_rookie: data.e1.puntos_rookie || 0,
                puntos_senior45: data.e1.puntos_senior45 || 0,
                puntos_senior55: data.e1.puntos_senior55 || 0,
                puntos_femenino: 0,
                score: 0
            });
        }
        if (Object.keys(data.e2).length > 0) {
            await supabase.from('resultados_etapas').insert({
                etapa_id: 2,
                jugador_id: id,
                puntos_absoluta: data.e2.puntos_absoluta || 0,
                puntos_rookie: data.e2.puntos_rookie || 0,
                puntos_senior45: data.e2.puntos_senior45 || 0,
                puntos_senior55: data.e2.puntos_senior55 || 0,
                puntos_femenino: 0,
                score: 0
            });
        }
    }
    console.log('✅ Etapas 1 y 2 guardadas.');

    // 4. Función auxiliar para guardar puntos de una etapa calculada
    async function saveStageResults(etapaId, puntosCalculados) {
        for (const r of puntosCalculados) {
            const abs = r.puntos['Absoluta'] !== undefined ? Math.round(r.puntos['Absoluta'] * 10) / 10 : 0;
            const rook = r.puntos['Rookie'] !== undefined ? Math.round(r.puntos['Rookie'] * 10) / 10 : 0;
            const s45 = r.puntos['Senior 45 +'] !== undefined ? Math.round(r.puntos['Senior 45 +'] * 10) / 10 : 0;
            const s55 = r.puntos['Senior 55 +'] !== undefined ? Math.round(r.puntos['Senior 55 +'] * 10) / 10 : 0;
            const fem = r.puntos['Damas'] !== undefined ? Math.round(r.puntos['Damas'] * 10) / 10 : 0;

            await supabase.from('resultados_etapas').insert({
                etapa_id: etapaId,
                jugador_id: r.jugador_id,
                puntos_absoluta: abs,
                puntos_rookie: rook,
                puntos_senior45: s45,
                puntos_senior55: s55,
                puntos_femenino: fem,
                score: r.score
            });
        }
    }

    // 5. Procesar Etapa 3
    console.log('⏳ Procesando Etapa 3...');
    const pathE3 = path.join(__dirname, '../Resultados_Torneos/Tournament Report from 3a Jornada Liga Catalana generated -2026-05-31 05_11_53.xlsx');
    const desempatesE3 = {
        '01a0156e-0161-4415-a37a-1395d958ad26': true, // Jorge Santiago Buqueras
        'c7433e20-2615-4396-880d-f0a76c5c081d': true  // Ivan Luengo
    };
    const brutosE3 = parseSingleRoundExcel(pathE3, dbPlayers, desempatesE3, 71);
    const puntosE3 = calcularPuntosEtapa(brutosE3);
    await saveStageResults(3, puntosE3);
    console.log(`✅ Etapa 3 guardada (${puntosE3.length} jugadores).`);

    // 6. Procesar Etapa 4
    console.log('⏳ Procesando Etapa 4...');
    const pathE4 = path.join(__dirname, '../Resultados_Torneos/Tournament Report from 4a Jornada Liga Catalana generated -2026-05-31 05_11_33.xlsx');
    const desempatesE4 = {
        '623e8adf-1b33-430c-8ee1-c1363b660f08': true, // Alberto Salazar
        'ee777b16-855b-486a-b49e-4a2c3c83abad': true  // Sergi Pahisa
    };
    const brutosE4 = parseSingleRoundExcel(pathE4, dbPlayers, desempatesE4, 71);
    const puntosE4 = calcularPuntosEtapa(brutosE4);
    await saveStageResults(4, puntosE4);
    console.log(`✅ Etapa 4 guardada (${puntosE4.length} jugadores).`);

    // 7. Procesar Etapa 5
    console.log('⏳ Procesando Etapa 5...');
    const pathE5 = path.join(__dirname, '../Resultados_Torneos/Tournament Report from 5a etapa Liga Catalana generated -2026-06-16 12_48_13.xlsx');
    const desempatesE5 = {
        'c7433e20-2615-4396-880d-f0a76c5c081d': true // Ivan Luengo
    };
    const brutosE5 = parseSingleRoundExcel(pathE5, dbPlayers, desempatesE5, 71);
    const puntosE5 = calcularPuntosEtapa(brutosE5);
    await saveStageResults(5, puntosE5);
    console.log(`✅ Etapa 5 guardada (${puntosE5.length} jugadores).`);

    // 8. Procesar Etapa 6
    console.log('⏳ Procesando Etapa 6...');
    const pathE6 = path.join(__dirname, '../Resultados_Torneos/Tournament Report from 6a etapa Liga Catalana generated -2026-07-07 12_26_48.xlsx');
    const brutosE6 = parseSingleRoundExcel(pathE6, dbPlayers, {}, 71);
    const puntosE6 = calcularPuntosEtapa(brutosE6);
    await saveStageResults(6, puntosE6);
    console.log(`✅ Etapa 6 guardada (${puntosE6.length} jugadores).`);

    // 9. Procesar Etapa 7 (Ronda 1 del archivo de 2026-07-20)
    console.log('⏳ Procesando Etapa 7...');
    const pathE7 = path.join(__dirname, '../Resultados_Torneos/Tournament Report from Etapas 7-12 Footgolf Catalunya generated -2026-07-20 10_21_22.xlsx');
    const wbE7 = XLSX.readFile(pathE7);
    const rowsE7 = XLSX.utils.sheet_to_json(wbE7.Sheets['Worksheet']).filter(r => parseInt(r.RONDA) === 1 && r['RONDA JUGADA'] === 'SI');
    
    const desempatesE7 = {
        'c7433e20-2615-4396-880d-f0a76c5c081d': true // Ivan Luengo
    };
    const brutosE7 = [];
    rowsE7.forEach(r => {
        let rawName = String(r['FOOTGOLFER NOMBRE_COMPLETO'] || '').trim();
        if (!rawName) return;
        if (rawName.toLowerCase().includes('matarrubia')) rawName = 'Erik Matarrubia Galera';
        if (rawName.toLowerCase().includes('alvarez')) rawName = 'Victor Alvarez Moreno';

        let strokesSum = 0;
        let validHoles = 0;
        for (let h = 1; h <= 18; h++) {
            const val = Number(r['HOYO ' + h]);
            if (!isNaN(val) && r['HOYO ' + h] !== '') {
                strokesSum += val;
                validHoles++;
            }
        }
        const score = (validHoles === 18 && strokesSum > 0) ? (strokesSum - 69) : Number(r.TPAR);

        const match = matchPlayerToDb(rawName, dbPlayers);
        if (match.player) {
            if (match.player.id === '7735029f-ef93-4dbc-9a55-907651401567') return; // Pol Santoro
            brutosE7.push({
                rawName,
                score,
                wonTie: !!(desempatesE7[match.player.id]),
                dbPlayer: match.player
            });
        }
    });
    const puntosE7 = calcularPuntosEtapa(brutosE7);
    await saveStageResults(7, puntosE7);
    console.log(`✅ Etapa 7 guardada (${puntosE7.length} jugadores).`);

    // 10. Procesar Etapa 8 (Ronda 2 del archivo de 2026-08-02)
    console.log('⏳ Procesando Etapa 8...');
    const pathE8 = path.join(__dirname, '../Resultados_Torneos/Tournament Report from Etapas 7-12 Footgolf Catalunya generated -2026-08-02 07_58_32.xlsx');
    const wbE8 = XLSX.readFile(pathE8);
    const rowsE8 = XLSX.utils.sheet_to_json(wbE8.Sheets['Worksheet']).filter(r => parseInt(r.RONDA) === 2 && r['RONDA JUGADA'] === 'SI');

    const brutosE8 = [];
    rowsE8.forEach(r => {
        let rawName = String(r['FOOTGOLFER NOMBRE_COMPLETO'] || '').trim();
        if (!rawName) return;
        if (rawName.toLowerCase().includes('matarrubia')) rawName = 'Erik Matarrubia Galera';
        if (rawName.toLowerCase().includes('alvarez')) rawName = 'Victor Alvarez Moreno';

        let strokesSum = 0;
        let validHoles = 0;
        for (let h = 1; h <= 18; h++) {
            const val = Number(r['HOYO ' + h]);
            if (!isNaN(val) && r['HOYO ' + h] !== '') {
                strokesSum += val;
                validHoles++;
            }
        }
        let score = (validHoles === 18 && strokesSum > 0) ? (strokesSum - 69) : Number(r.TPAR);

        const match = matchPlayerToDb(rawName, dbPlayers);
        if (match.player) {
            if (match.player.id === '7735029f-ef93-4dbc-9a55-907651401567') return;

            // Ajustes solicitados para la Etapa 8:
            if (match.player.id === '80808d1a-3f56-4879-ab0f-d2891e2d36c8') score += 1; // JuanRa Perez
            if (match.player.id === 'e8edfffd-438f-4c64-9aad-ceed5ad0b34b') score -= 1; // Jesus Pizarro

            brutosE8.push({
                rawName,
                score,
                wonTie: false,
                dbPlayer: match.player
            });
        }
    });
    const puntosE8 = calcularPuntosEtapa(brutosE8);
    await saveStageResults(8, puntosE8);
    console.log(`✅ Etapa 8 guardada (${puntosE8.length} jugadores).`);

    // 11. Recalcular snapshots acumulados para Etapas 1 a 8
    console.log('⏳ Generando y guardando JSONs acumulados en la tabla etapas...');
    const { data: todosLosResultados, error: errTodos } = await supabase
        .from('resultados_etapas')
        .select('*, jugadores(nickname, nombre_completo)')
        .order('etapa_id', { ascending: true });

    if (errTodos) throw errTodos;

    const generateSnapshot = (hastaJornada) => {
        const resultadosHasta = todosLosResultados.filter(r => r.etapa_id <= hastaJornada);
        const general = calcularClasificacionGeneral(resultadosHasta);

        const categoriasFinal = { 'Absoluta': [], 'Rookie': [], 'Senior 45 +': [], 'Senior 55 +': [], 'Damas': [], 'Junior': [], 'Liga Plata': [] };

        Object.keys(categoriasFinal).forEach(cat => {
            const rank = general.map(j => {
                const c = j.categorias[cat];
                if (!c) return null;
                if (cat !== 'Liga Plata' && c.total <= 0) return null;

                const returnObj = {
                    name: j.nombre_completo || j.nickname,
                    total: Math.round(c.total * 10) / 10,
                    pos: 0
                };

                for (let i = 1; i <= hastaJornada; i++) {
                    if (c[`e${i}`] !== undefined) {
                        returnObj[`e${i}`] = Math.round(c[`e${i}`] * 10) / 10;
                    }
                }

                return returnObj;
            }).filter(j => j !== null).sort((a, b) => b.total - a.total);

            rank.forEach((p, i) => p.pos = i + 1);
            categoriasFinal[cat] = rank;
        });

        return {
            jornada: hastaJornada,
            ultima_actualizacion: new Date().toISOString(),
            categorias: categoriasFinal
        };
    };

    for (let i = 1; i <= 8; i++) {
        const snapshot = generateSnapshot(i);
        await supabase.from('etapas').update({
            archivo_excel: JSON.stringify(snapshot),
            estado: 'finalizada'
        }).eq('id', i);
        console.log(`✅ Snapshot acumulado para Etapa ${i} guardado.`);
    }

    console.log('\n🏆 === CLASIFICACIÓN GENERAL TRAS ETAPA 8 (TOP 10 ABSOLUTA) ===');
    const finalSnapshot = generateSnapshot(8);
    finalSnapshot.categorias['Absoluta'].slice(0, 10).forEach(p => {
        console.log(`#${p.pos} ${p.name} | Total: ${p.total} pts | J1:${p.e1||'-'} J2:${p.e2||'-'} J3:${p.e3||'-'} J4:${p.e4||'-'} J5:${p.e5||'-'} J6:${p.e6||'-'} J7:${p.e7||'-'} J8:${p.e8||'-'}`);
    });

    console.log('\n🏆 === LIGA PLATA TRAS ETAPA 8 ===');
    finalSnapshot.categorias['Liga Plata'].forEach(p => {
        console.log(`#${p.pos} ${p.name} | Total: ${p.total} pts | J7:${p.e7||'-'} J8:${p.e8||'-'}`);
    });
}

rebuildAll().catch(err => {
    console.error('💥 Error reconstruyendo:', err);
    process.exit(1);
});
