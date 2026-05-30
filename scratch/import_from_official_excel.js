const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const { matchPlayerToDb } = require('../lib/matching');
const { calcularClasificacionGeneral } = require('../lib/ranking-engine');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('🧹 Limpiando resultados anteriores...');
    await supabase.from('resultados_etapas').delete().gt('etapa_id', 0);
    console.log('✅ Base de datos limpia de resultados.');

    const { data: dbPlayers } = await supabase.from('jugadores').select('*');

    const stagesConfig = [
        {
            id: 1,
            sheets: {
                absoluta: 'Etapa 1 Masculino',
                rookie: 'Etapa 1 Rookie',
                senior: 'Etapa 1 Senior'
            }
        },
        {
            id: 2,
            sheets: {
                absoluta: 'Etapa 2 Masculina',
                rookie: 'Etapa 2 Rookie',
                senior: 'Etapa 2 Senior'
            }
        },
        {
            id: 3,
            sheets: {
                absoluta: 'Etapa 3 Absoluta',
                rookie: 'Etapa 3 Rookie',
                senior: 'Etapa 3 Senior'
            }
        },
        {
            id: 4,
            sheets: {
                absoluta: 'Etapa 4 Absoluta',
                rookie: 'Etapa 4 Rookie',
                senior: 'Etapa 4 Senior'
            }
        }
    ];

    const excelPath = path.join(__dirname, '../public/docs/Ranking Catalán 2026.xlsx');
    const wb = XLSX.readFile(excelPath);

    for (const stage of stagesConfig) {
        console.log(`⏳ Procesando Etapa ${stage.id}...`);

        // Estructura: player_id -> { puntos_absoluta, puntos_rookie, puntos_senior45, puntos_senior55, puntos_femenino, score }
        const stageResults = new Map();

        const nameOverrides = {
            "chema": "Chema Martínez Guillamon",
            "erik mata": "Erik Matarrubia Galera",
            "mata": "Erik Matarrubia Galera",
            "guillamon": "Chema Martínez Guillamon"
        };

        const processSheet = (sheetName, categoryField) => {
            const sheet = wb.Sheets[sheetName];
            if (!sheet) {
                console.warn(`⚠️ Hoja ${sheetName} no encontrada.`);
                return;
            }
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' }).slice(1);

            for (const row of rows) {
                let name = String(row['E'] || '').trim();
                const nickname = String(row['C'] || '').trim();
                if (!name && !nickname) continue;

                // Clean emojis and check overrides
                const normName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const normNick = nickname.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                for (const [key, target] of Object.entries(nameOverrides)) {
                    if (normName.includes(key) || normNick.includes(key)) {
                        name = target;
                        break;
                    }
                }

                // Match player
                let match = matchPlayerToDb(name, dbPlayers);
                if (!match.player && nickname) {
                    match = matchPlayerToDb(nickname, dbPlayers);
                }

                if (!match.player) {
                    console.warn(`⚠️ No se pudo emparejar al jugador: "${name}" (${nickname})`);
                    continue;
                }

                const player = match.player;
                const pts = Number(row['G'] || 0);
                const scoreVal = Number(row['F'] || 0);

                if (!stageResults.has(player.id)) {
                    stageResults.set(player.id, {
                        etapa_id: stage.id,
                        jugador_id: player.id,
                        puntos_absoluta: 0,
                        puntos_rookie: 0,
                        puntos_senior45: 0,
                        puntos_senior55: 0,
                        puntos_femenino: 0,
                        score: scoreVal,
                        dbPlayer: player
                    });
                }

                const res = stageResults.get(player.id);
                
                // Si viene del Masculino/Absoluta, va a absoluta
                if (categoryField === 'absoluta') {
                    res.puntos_absoluta = pts;
                    res.score = scoreVal; // El score del torneo absoluto es el principal
                } else if (categoryField === 'rookie') {
                    res.puntos_rookie = pts;
                } else if (categoryField === 'senior') {
                    res.puntos_senior45 = pts;
                    if (player.categorias_calculadas && player.categorias_calculadas.includes('Senior 55 +')) {
                        res.puntos_senior55 = pts;
                    }
                }
            }
        };

        processSheet(stage.sheets.absoluta, 'absoluta');
        processSheet(stage.sheets.rookie, 'rookie');
        processSheet(stage.sheets.senior, 'senior');

        // Upsert all records for this stage
        console.log(`   Subiendo ${stageResults.size} resultados a la base de datos...`);
        for (const [id, res] of stageResults.entries()) {
            if (res.dbPlayer.categorias_calculadas && res.dbPlayer.categorias_calculadas.includes('Damas')) {
                res.puntos_femenino = res.puntos_absoluta;
            }

            const { error } = await supabase.from('resultados_etapas').upsert({
                etapa_id: res.etapa_id,
                jugador_id: res.jugador_id,
                puntos_absoluta: Math.round(res.puntos_absoluta * 10) / 10,
                puntos_rookie: Math.round(res.puntos_rookie * 10) / 10,
                puntos_senior45: Math.round(res.puntos_senior45 * 10) / 10,
                puntos_senior55: Math.round(res.puntos_senior55 * 10) / 10,
                puntos_femenino: Math.round(res.puntos_femenino * 10) / 10,
                score: res.score
            }, { onConflict: 'etapa_id, jugador_id' });

            if (error) {
                console.error(`❌ Error insertando resultado de ${res.dbPlayer.nickname}:`, error.message);
            }
        }
    }

    console.log('⏳ Recalculando general y generando snapshots...');
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

    console.log('🎉 ¡Snapshots de clasificación y resultados recalculados y guardados con éxito desde el Excel oficial!');
}

run().catch(console.error);
