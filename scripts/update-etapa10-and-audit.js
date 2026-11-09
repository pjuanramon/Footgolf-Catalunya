const { supabase } = require('../lib/supabase');
const { matchPlayerToDb } = require('../lib/matching');
const { calcularPuntosEtapa, calcularClasificacionGeneral } = require('../lib/ranking-engine');
const XLSX = require('xlsx');
const path = require('path');

async function main() {
    console.log('--- 1. Verificando jugadores y regla Senior 45+ (nacidos <= 1980 en 2026) ---');
    const { data: dbPlayers, error: errPlayers } = await supabase.from('jugadores').select('*');
    if (errPlayers) throw errPlayers;

    for (const p of dbPlayers) {
        const cats = p.categorias_calculadas || [];
        const isSenior45 = cats.includes('Senior 45 +');
        const isSenior55 = cats.includes('Senior 55 +');
        if (isSenior45 || isSenior55 || p.fecha_nacimiento) {
            console.log(`Player: ${p.nickname} (${p.nombre_completo}) | DOB: ${p.fecha_nacimiento} | Cats: ${JSON.stringify(cats)}`);
        }
    }

    console.log('\n--- 2. Corrigiendo puntos_senior45 históricos en Etapa 1 y Etapa 2 ---');
    // Etapa 1 Senior 45+:
    // Olivier Tressens (9a247895-2abf-42c8-a5d8-6fe00864b2d5): 250
    // Raúl Linares (b25e1645-1edf-44d0-b705-e518eb746112): 230
    // Gustavo Verse (bff691d6-db4f-4962-aa3d-97d8813f06c8): 215 (y senior55 = 250)
    // Fernando Martínez Guillamón (0454ca94-1bfd-4e53-a29c-80e39af53b98): 200
    const e1SeniorFixes = [
        { jugador_id: '9a247895-2abf-42c8-a5d8-6fe00864b2d5', name: 'Olivier Tressens', s45: 250, s55: 0 },
        { jugador_id: 'b25e1645-1edf-44d0-b705-e518eb746112', name: 'Raúl Linares', s45: 230, s55: 0 },
        { jugador_id: 'bff691d6-db4f-4962-aa3d-97d8813f06c8', name: 'Gustavo Verse', s45: 215, s55: 250 },
        { jugador_id: '0454ca94-1bfd-4e53-a29c-80e39af53b98', name: 'Fernando Martínez Guillamón', s45: 200, s55: 0 }
    ];

    for (const fix of e1SeniorFixes) {
        const { error } = await supabase
            .from('resultados_etapas')
            .update({ puntos_senior45: fix.s45, puntos_senior55: fix.s55 })
            .eq('etapa_id', 1)
            .eq('jugador_id', fix.jugador_id);
        if (error) console.error(`Error E1 ${fix.name}:`, error.message);
        else console.log(`✅ E1 actualizado para ${fix.name}: Senior 45+ = ${fix.s45}, Senior 55+ = ${fix.s55}`);
    }

    // Etapa 2 Senior 45+:
    // Olivier Tressens (9a247895-2abf-42c8-a5d8-6fe00864b2d5): 250
    // Raúl Linares (b25e1645-1edf-44d0-b705-e518eb746112): 230
    // David Linares Ramos (7939d83a-d19f-422c-a572-30cfbd7738f4): 215
    // Fernando Martínez Guillamón (0454ca94-1bfd-4e53-a29c-80e39af53b98): 200
    // Gustavo Verse (bff691d6-db4f-4962-aa3d-97d8813f06c8): 190 (y senior55 = 250)
    // Giacomo Bonacini (3d54abc8-8b66-475f-a98f-04d6fae34fe6): 180
    const e2SeniorFixes = [
        { jugador_id: '9a247895-2abf-42c8-a5d8-6fe00864b2d5', name: 'Olivier Tressens', s45: 250, s55: 0 },
        { jugador_id: 'b25e1645-1edf-44d0-b705-e518eb746112', name: 'Raúl Linares', s45: 230, s55: 0 },
        { jugador_id: '7939d83a-d19f-422c-a572-30cfbd7738f4', name: 'David Linares Ramos', s45: 215, s55: 0 },
        { jugador_id: '0454ca94-1bfd-4e53-a29c-80e39af53b98', name: 'Fernando Martínez Guillamón', s45: 200, s55: 0 },
        { jugador_id: 'bff691d6-db4f-4962-aa3d-97d8813f06c8', name: 'Gustavo Verse', s45: 190, s55: 250 },
        { jugador_id: '3d54abc8-8b66-475f-a98f-04d6fae34fe6', name: 'Giacomo Bonacini', s45: 180, s55: 0 }
    ];

    for (const fix of e2SeniorFixes) {
        const { error } = await supabase
            .from('resultados_etapas')
            .update({ puntos_senior45: fix.s45, puntos_senior55: fix.s55 })
            .eq('etapa_id', 2)
            .eq('jugador_id', fix.jugador_id);
        if (error) console.error(`Error E2 ${fix.name}:`, error.message);
        else console.log(`✅ E2 actualizado para ${fix.name}: Senior 45+ = ${fix.s45}, Senior 55+ = ${fix.s55}`);
    }

    console.log('\n--- 3. Procesando Etapa 10 (Ronda 4 del Excel) ---');
    const excelPath = path.join(__dirname, '..', 'Resultados_Torneos', 'Tournament Report from Etapas 7-12 Footgolf Catalunya generated -2026-11-09 10_30_53.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' }).slice(1);

    const ronda4Rows = rows.filter(r => Number(r['A']) === 4);
    console.log(`Filas de Ronda 4 (Etapa 10): ${ronda4Rows.length}`);

    const resultadosBrutos = [];
    for (const row of ronda4Rows) {
        const rawName = String(row['D'] || '').trim();
        if (!rawName) continue;
        const rondaJugada = String(row['F'] || '').trim().toUpperCase();
        if (rondaJugada === 'NO' || rondaJugada === '') continue;

        const isSalazar = rawName.toLowerCase().includes('salazar');
        const isAbril = rawName.toLowerCase().includes('abril');
        const isMatarrubia = rawName.toLowerCase().includes('matarrubia');
        const isAlvarez = rawName.toLowerCase().includes('alvarez');
        const isFerrari = rawName.toLowerCase().includes('ferrari') || rawName.toLowerCase().includes('ferrama');
        const isCorrea = rawName.toLowerCase().includes('correa') || rawName.trim().toLowerCase() === 'alexis';

        const match = matchPlayerToDb(rawName, dbPlayers || []);
        let p = match.player;

        if (isSalazar) p = dbPlayers.find(x => x.id === '623e8adf-1b33-430c-8ee1-c1363b660f08') || p;
        if (isAbril) p = dbPlayers.find(x => x.id === 'a6f73ff3-a3e6-4dc3-9ba4-08f6cb8c70a8') || p;
        if (isMatarrubia) p = dbPlayers.find(x => x.id === 'fd33030a-9b8f-444e-8fe3-cb2c02d784f3') || p;
        if (isAlvarez) p = dbPlayers.find(x => x.id === '30e5d409-5804-4a5c-936e-7eb1b09e27a3') || p;
        if (isFerrari) p = dbPlayers.find(x => x.id === '90e077fc-37e0-4a62-93b5-a39f3d971d31') || p;
        if (isCorrea) p = dbPlayers.find(x => x.id === 'ca86c5c8-e4e5-4f07-8c4b-b85af2d98335') || p;

        let tieneLicenciaValida = p ? p.tiene_licencia : false;
        if (isSalazar || isAbril || isMatarrubia || isAlvarez) tieneLicenciaValida = true;
        if (!tieneLicenciaValida) {
            console.log(`Ignorado sin licencia: ${rawName}`);
            continue;
        }

        const finalScore = Number(row['Y'] || 0);
        // Desempates confirmados por el usuario:
        // 1) JuanRa Perez ganó el desempate de 3º en Absoluta (-3 vs Chema Martínez -3)
        // 2) Daniel Abril ganó el desempate de 3º en Rookie (-1 vs Gastón Masuck -1)
        const isJuanRa = p.nickname.toLowerCase().includes('juanra');
        const isDaniAbril = p.id === 'a6f73ff3-a3e6-4dc3-9ba4-08f6cb8c70a8';

        resultadosBrutos.push({
            rawName,
            score: finalScore,
            wonTie: isJuanRa, // Para Absoluta, solo JuanRa tiene desempate de podio
            wonTieByCategory: {
                'Absoluta': isJuanRa,
                'Rookie': isDaniAbril
            },
            dbPlayer: p
        });
    }

    const puntosEtapa = calcularPuntosEtapa(resultadosBrutos);
    // Ajustar explícitamente el desempate por categoría de Daniel Abril y Gastón Masuck:
    // En Absoluta (-1 es 6º-8º empatado con Alberto Salazar -> (180+170+160)/3 = 170 cada uno).
    // En Rookie (-1 es 3º-4º empatado -> Daniel Abril ganó desempate = 215, Gastón Masuck = 200).
    for (const r of puntosEtapa) {
        if (r.jugador_id === 'a6f73ff3-a3e6-4dc3-9ba4-08f6cb8c70a8') { // Daniel Abril
            r.puntos['Absoluta'] = 170;
            r.puntos['Rookie'] = 215;
        }
        if (r.nickname.toLowerCase().includes('masuck')) { // Gastón Masuck
            r.puntos['Absoluta'] = 170;
            r.puntos['Rookie'] = 200;
        }
    }

    // Limpiar posibles registros previos de etapa 10 e insertar los 18 resultados oficiales
    await supabase.from('resultados_etapas').delete().eq('etapa_id', 10);

    for (const r of puntosEtapa) {
        const payload = {
            etapa_id: 10,
            jugador_id: String(r.jugador_id),
            puntos_absoluta: r.puntos['Absoluta'] || 0,
            puntos_rookie: r.puntos['Rookie'] || 0,
            puntos_senior45: r.puntos['Senior 45 +'] || 0,
            puntos_senior55: r.puntos['Senior 55 +'] || 0,
            puntos_femenino: r.puntos['Damas'] || 0,
            score: Math.round(Number(r.score))
        };
        const { error } = await supabase.from('resultados_etapas').upsert(payload, { onConflict: 'etapa_id, jugador_id' });
        if (error) console.error(`Error upsert E10 ${r.nickname}:`, error.message);
        else console.log(`✅ E10 [${r.score >= 0 ? '+' + r.score : r.score}] ${r.nickname}: Abs=${payload.puntos_absoluta}, Rookie=${payload.puntos_rookie}, S45=${payload.puntos_senior45}, S55=${payload.puntos_senior55}`);
    }

    console.log('\n--- 4. Regenerando snapshots de clasificaciones (etapas 1 a 10) ---');
    const { data: todosLosResultados } = await supabase
        .from('resultados_etapas')
        .select('*, jugadores(nickname, nombre_completo)')
        .order('etapa_id', { ascending: true });

    for (let maxEtapa = 1; maxEtapa <= 10; maxEtapa++) {
        const resultadosHastaEtapa = todosLosResultados.filter(r => r.etapa_id <= maxEtapa);
        const general = calcularClasificacionGeneral(resultadosHastaEtapa);
        const categoriasFinal = {
            'Absoluta': [],
            'Rookie': [],
            'Senior 45 +': [],
            'Senior 55 +': [],
            'Damas': [],
            'Junior': [],
            'Liga Plata': []
        };

        Object.keys(categoriasFinal).forEach(cat => {
            const rankingCat = general.map(j => {
                const catData = j.categorias[cat];
                if (!catData) return null;
                if (cat !== 'Liga Plata' && catData.total <= 0) return null;
                return {
                    name: j.nombre_completo || j.nickname,
                    total: catData.total,
                    pos: 0,
                    ...catData
                };
            }).filter(j => j !== null).sort((a, b) => b.total - a.total);
            rankingCat.forEach((p, idx) => p.pos = idx + 1);
            categoriasFinal[cat] = rankingCat;
        });

        const finalJson = {
            jornada: maxEtapa,
            ultima_actualizacion: new Date().toISOString(),
            categorias: categoriasFinal
        };

        const { error: errUpdateEtapa } = await supabase
            .from('etapas')
            .update({
                archivo_excel: JSON.stringify(finalJson),
                estado: 'finalizada'
            })
            .eq('id', maxEtapa);

        if (errUpdateEtapa) console.error(`Error actualizando etapa ${maxEtapa}:`, errUpdateEtapa.message);
        else console.log(`✅ Snapshot etapa ${maxEtapa} actualizado y marcada como 'finalizada'.`);

        if (maxEtapa === 10) {
            console.log('\n=== CLASIFICACIÓN GENERAL TRAS ETAPA 10 ===');
            for (const cat of ['Absoluta', 'Rookie', 'Senior 45 +', 'Senior 55 +', 'Liga Plata', 'Damas']) {
                console.log(`\n--- ${cat} ---`);
                categoriasFinal[cat].slice(0, 25).forEach(p => {
                    const stagesStr = [1,2,3,4,5,6,7,8,9,10].map(n => p[`e${n}`] !== undefined ? `J${n}:${p[`e${n}`]}` : '').filter(Boolean).join(', ');
                    console.log(`${p.pos}. ${p.name} — ${p.total} pts (${stagesStr})`);
                });
            }
        }
    }
}

main().catch(console.error);
