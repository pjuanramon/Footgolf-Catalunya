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

    // 3. Procesar E3 (Excel)
    console.log('⏳ Procesando Etapa 3 (Excel)...');
    const excelPathE3 = path.join(__dirname, '../data/Jornadas/Tournament Report from 3a Jornada Liga Catalana generated -2026-03-16 09_42_56.xlsx');
    const workbookE3 = XLSX.readFile(excelPathE3);
    const sheetE3 = workbookE3.Sheets[workbookE3.SheetNames[0]];
    const rowsE3 = XLSX.utils.sheet_to_json(sheetE3, { header: 'A', defval: '' }).slice(1);
    
    const resultadosBrutosE3 = [];
    for (const row of rowsE3) {
        const rawName = String(row['D'] || '').trim();
        if (!rawName) continue;
        if (String(row['F']).trim().toUpperCase() === 'NO') continue;
        const match = matchPlayerToDb(rawName, dbPlayers);
        resultadosBrutosE3.push({ rawName, score: Number(row['Y'] || 0), dbPlayer: match.player });
    }

    const puntosE3 = calcularPuntosEtapa(resultadosBrutosE3);
    for (const r of puntosE3) {
        // Asegurar que no hayan decimales infinitos
        const abs = r.puntos['Absoluta'] !== undefined ? Math.round(r.puntos['Absoluta'] * 10) / 10 : 0;
        const rook = r.puntos['Rookie'] !== undefined ? Math.round(r.puntos['Rookie'] * 10) / 10 : 0;
        const s45 = r.puntos['Senior 45 +'] !== undefined ? Math.round(r.puntos['Senior 45 +'] * 10) / 10 : 0;
        const s55 = r.puntos['Senior 55 +'] !== undefined ? Math.round(r.puntos['Senior 55 +'] * 10) / 10 : 0;
        const fem = r.puntos['Damas'] !== undefined ? Math.round(r.puntos['Damas'] * 10) / 10 : 0;

        await supabase.from('resultados_etapas').upsert({
            etapa_id: 3, 
            jugador_id: r.jugador_id, 
            puntos_absoluta: abs,
            puntos_rookie: rook, 
            puntos_senior45: s45,
            puntos_senior55: s55, 
            puntos_femenino: fem,
            score: r.score
        }, { onConflict: 'etapa_id, jugador_id' });
    }
    console.log('✅ E3 procesada e insertada en resultados_etapas.');

    // 4. Procesar E4 (Excel)
    console.log('⏳ Procesando Etapa 4 (Excel)...');
    const excelPathE4 = path.join(__dirname, '../Hits_Footgolf_2026-04-12_Aliased.xlsx');
    const workbookE4 = XLSX.readFile(excelPathE4);
    const sheetE4 = workbookE4.Sheets[workbookE4.SheetNames[0]];
    const rowsE4 = XLSX.utils.sheet_to_json(sheetE4, { header: 'A', defval: '' }).slice(1);
    
    // Desempates conocidos de la Etapa 4
    const desempatesE4 = {
        '623e8adf-1b33-430c-8ee1-c1363b660f08': true // Alberto Salazar ganó su desempate
    };

    const resultadosBrutosE4 = [];
    for (const row of rowsE4) {
        const rawName = String(row['D'] || '').trim();
        if (!rawName) continue;

        const isSalazar = rawName.toLowerCase().includes('salazar');
        const isAbril = rawName.toLowerCase().includes('abril');

        const match = matchPlayerToDb(rawName, dbPlayers);
        let p = match.player;

        // Forzar IDs específicos para evitar fallos de matching
        if (isSalazar) {
            p = dbPlayers.find(x => x.id === '623e8adf-1b33-430c-8ee1-c1363b660f08') || p;
        }
        if (isAbril) {
            p = dbPlayers.find(x => x.id === 'a6f73ff3-a3e6-4dc3-9ba4-08f6cb8c70a8') || p;
        }

        let tieneLicenciaValida = false;
        if (p) {
            tieneLicenciaValida = p.tiene_licencia;
            if (isSalazar || isAbril) tieneLicenciaValida = true;
        } else {
            tieneLicenciaValida = String(row['F']).trim().toUpperCase() !== 'NO';
        }

        if (!tieneLicenciaValida) continue;

        let wonTie = false;
        if (p && desempatesE4[p.id]) wonTie = true;

        resultadosBrutosE4.push({
            rawName,
            score: Number(row['Y'] || 0),
            wonTie: wonTie,
            dbPlayer: p
        });
    }

    const puntosE4 = calcularPuntosEtapa(resultadosBrutosE4);
    for (const r of puntosE4) {
        const abs = r.puntos['Absoluta'] !== undefined ? Math.round(r.puntos['Absoluta'] * 10) / 10 : 0;
        const rook = r.puntos['Rookie'] !== undefined ? Math.round(r.puntos['Rookie'] * 10) / 10 : 0;
        const s45 = r.puntos['Senior 45 +'] !== undefined ? Math.round(r.puntos['Senior 45 +'] * 10) / 10 : 0;
        const s55 = r.puntos['Senior 55 +'] !== undefined ? Math.round(r.puntos['Senior 55 +'] * 10) / 10 : 0;
        const fem = r.puntos['Damas'] !== undefined ? Math.round(r.puntos['Damas'] * 10) / 10 : 0;
        const jun = r.puntos['Junior'] !== undefined ? Math.round(r.puntos['Junior'] * 10) / 10 : 0;

        await supabase.from('resultados_etapas').upsert({
            etapa_id: 4, 
            jugador_id: r.jugador_id, 
            puntos_absoluta: abs,
            puntos_rookie: rook, 
            puntos_senior45: s45,
            puntos_senior55: s55, 
            puntos_femenino: fem,
            puntos_junior: jun,
            score: Math.round(Number(r.score))
        }, { onConflict: 'etapa_id, jugador_id' });
    }
    console.log('✅ E4 procesada e insertada en resultados_etapas.');

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

                // Asignar e1, e2, e3... redondeados
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
}

rebuild().catch(console.error);
