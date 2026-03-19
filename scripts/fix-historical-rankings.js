const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const { matchPlayerToDb, normalizeName } = require('../lib/matching');
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

async function run() {
    console.log('--- Restaurando Clasificaciones E1, E2, E3 ---');

    // 1. Obtener jugadores
    const { data: dbPlayers } = await supabase.from('jugadores').select('*');
    
    // 2. Procesar E1 y E2 (Histórico)
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
            await supabase.from('resultados_etapas').upsert({ etapa_id: 1, jugador_id: id, puntos_absoluta: data.e1.absoluta || 0, puntos_rookie: data.e1.rookie || 0 }, { onConflict: 'etapa_id, jugador_id' });
        }
        if (data.e2.absoluta || data.e2.rookie) {
            await supabase.from('resultados_etapas').upsert({ etapa_id: 2, jugador_id: id, puntos_absoluta: data.e2.absoluta || 0, puntos_rookie: data.e2.rookie || 0 }, { onConflict: 'etapa_id, jugador_id' });
        }
    }
    console.log('✅ E1 y E2 insertados en resultados_etapas');

    // 3. Procesar E3 (Excel)
    const excelPath = path.join(__dirname, '../data/Jornadas/Tournament Report from 3a Jornada Liga Catalana generated -2026-03-16 09_42_56.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' }).slice(1);
    
    const resultadosBrutosE3 = [];
    for (const row of rows) {
        const rawName = String(row['D'] || '').trim();
        if (!rawName) continue;
        if (String(row['F']).trim().toUpperCase() === 'NO') continue;
        const match = matchPlayerToDb(rawName, dbPlayers);
        resultadosBrutosE3.push({ rawName, score: Number(row['Y'] || 0), dbPlayer: match.player });
    }

    const puntosE3 = calcularPuntosEtapa(resultadosBrutosE3);
    for (const r of puntosE3) {
        await supabase.from('resultados_etapas').upsert({
            etapa_id: 3, jugador_id: r.jugador_id, puntos_absoluta: r.puntos['Absoluta'] || 0,
            puntos_rookie: r.puntos['Rookie'] || 0, puntos_senior45: r.puntos['Senior 45 +'] || 0,
            puntos_senior55: r.puntos['Senior 55 +'] || 0, puntos_femenino: r.puntos['Femenino'] || 0,
            score: r.score
        }, { onConflict: 'etapa_id, jugador_id' });
    }
    console.log('✅ E3 procesada e insertada en resultados_etapas');

    // 4. Generar y guardar JSONs para el frontend (E1, E2, E3)
    const { data: todos } = await supabase.from('resultados_etapas').select('*, jugadores(nickname)');
    
    const generateSnapshot = (hastaJornada) => {
        const resultadosHasta = todos.filter(r => r.etapa_id <= hastaJornada);
        const general = calcularClasificacionGeneral(resultadosHasta);
        
        const categoriasFinal = { 'Absoluta': [], 'Rookie': [], 'Senior 45 +': [], 'Senior 55 +': [], 'Femenino': [] };
        Object.keys(categoriasFinal).forEach(cat => {
            const rank = general.map(j => {
                const c = j.categorias[cat] || { total: 0, etapas: [] };
                return { name: j.nickname, total: c.total, e1: c.etapas[0] || 0, e2: c.etapas[1] || 0, e3: c.etapas[2] || 0, pos: 0 };
            }).filter(j => j.total > 0).sort((a,b) => b.total - a.total);
            rank.forEach((p, i) => p.pos = i+1);
            categoriasFinal[cat] = rank;
        });
        return { jornada: hastaJornada, ultima_actualizacion: new Date().toISOString(), categorias: categoriasFinal };
    };

    await supabase.from('etapas').update({ archivo_excel: JSON.stringify(generateSnapshot(1)) }).eq('id', 1);
    await supabase.from('etapas').update({ archivo_excel: JSON.stringify(generateSnapshot(2)) }).eq('id', 2);
    await supabase.from('etapas').update({ archivo_excel: JSON.stringify(generateSnapshot(3)) }).eq('id', 3);

    console.log('🎉 ¡Snapshots de clasificación restaurados para E1, E2 y E3!');
}

run().catch(console.error);
