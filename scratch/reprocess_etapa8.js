const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const { matchPlayerToDb } = require('../lib/matching');
const { calcularPuntosEtapa, calcularClasificacionGeneral } = require('../lib/ranking-engine');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runEtapa8() {
    console.log('🚀 Iniciando ingesta y actualización de clasificación para la Etapa 8...');

    // 1. Obtener jugadores de la BD
    const { data: dbPlayers, error: errPlayers } = await supabase.from('jugadores').select('*');
    if (errPlayers) throw new Error('Error obteniendo jugadores: ' + errPlayers.message);

    // 2. Cargar Excel oficial de Etapas 7-12
    const excelPath = path.join(__dirname, '../Resultados_Torneos/Tournament Report from Etapas 7-12 Footgolf Catalunya generated -2026-08-02 07_58_32.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets['Worksheet'];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Filtrar solo filas de Ronda 2 (Etapa 8) jugadas
    const e8Rows = rows.filter(r => r.RONDA === 2 && r['RONDA JUGADA'] === 'SI');
    console.log(`📋 Filas encontradas para Etapa 8 (Ronda 2): ${e8Rows.length}`);

    const resultadosBrutos = [];
    e8Rows.forEach(r => {
        const rawName = String(r['FOOTGOLFER NOMBRE_COMPLETO'] || '').trim();
        if (!rawName) return;

        // Sumar hoyos 1 a 18
        let strokesSum = 0;
        let validHoles = 0;
        for (let h = 1; h <= 18; h++) {
            const val = Number(r['HOYO ' + h]);
            if (!isNaN(val) && r['HOYO ' + h] !== '') {
                strokesSum += val;
                validHoles++;
            }
        }

        // TPAR relativo al par del campo (69)
        let tpar = (validHoles === 18 && strokesSum > 0) ? (strokesSum - 69) : Number(r.TPAR);

        let match = matchPlayerToDb(rawName, dbPlayers);
        let p = match.player;

        // Overrides manuales si fallara el match por apodos
        if (rawName.toLowerCase().includes('matarrubia')) {
            p = dbPlayers.find(x => x.id === 'fd33030a-9b8f-444e-8fe3-cb2c02d784f3') || p;
        }
        if (rawName.toLowerCase().includes('alvarez')) {
            p = dbPlayers.find(x => x.id === '30e5d409-5804-4a5c-936e-7eb1b09e27a3') || p;
        }

        if (p) {
            resultadosBrutos.push({
                rawName,
                score: tpar,
                dbPlayer: p
            });
        } else {
            console.warn(`⚠️ Jugador no encontrado en DB: ${rawName}`);
        }
    });

    console.log(`✅ Jugadores matcheados correctamente: ${resultadosBrutos.length}`);

    // 3. Calcular puntos con ranking-engine
    const puntosEtapa = calcularPuntosEtapa(resultadosBrutos);
    console.log(`📊 Puntos calculados para ${puntosEtapa.length} jugadores.`);

    // 4. Guardar resultados en resultados_etapas (Upsert para Etapa 8)
    for (const r of puntosEtapa) {
        const abs = r.puntos['Absoluta'] !== undefined ? Math.round(r.puntos['Absoluta'] * 10) / 10 : 0;
        const rook = r.puntos['Rookie'] !== undefined ? Math.round(r.puntos['Rookie'] * 10) / 10 : 0;
        const s45 = r.puntos['Senior 45 +'] !== undefined ? Math.round(r.puntos['Senior 45 +'] * 10) / 10 : 0;
        const s55 = r.puntos['Senior 55 +'] !== undefined ? Math.round(r.puntos['Senior 55 +'] * 10) / 10 : 0;
        const fem = r.puntos['Damas'] !== undefined ? Math.round(r.puntos['Damas'] * 10) / 10 : 0;

        const { error } = await supabase.from('resultados_etapas').upsert({
            etapa_id: 8,
            jugador_id: r.jugador_id,
            puntos_absoluta: abs,
            puntos_rookie: rook,
            puntos_senior45: s45,
            puntos_senior55: s55,
            puntos_femenino: fem,
            score: r.score
        }, { onConflict: 'etapa_id, jugador_id' });

        if (error) {
            console.error(`❌ Error al guardar etapa 8 para ${r.nickname}:`, error.message);
            throw error;
        }
    }
    console.log('✅ Etapa 8 insertada/actualizada en tabla resultados_etapas.');

    // 5. Marcar Etapa 8 como cerrada / finalizada
    await supabase.from('etapas').update({ estado: 'cerrada' }).eq('id', 8);

    // 6. Recalcular snapshots acumulados de clasificación hasta la Etapa 8
    const { data: todosLosResultados } = await supabase
        .from('resultados_etapas')
        .select('*, jugadores(nickname, nombre_completo)')
        .order('etapa_id', { ascending: true });

    const generateSnapshot = (hastaJornada) => {
        const resultadosHasta = todosLosResultados.filter(r => r.etapa_id <= hastaJornada);
        const general = calcularClasificacionGeneral(resultadosHasta);

        const categoriasFinal = { 'Absoluta': [], 'Rookie': [], 'Senior 45 +': [], 'Senior 55 +': [], 'Damas': [], 'Junior': [], 'Liga Plata': [] };

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

    // Actualizar snapshots en la tabla etapas para todas las etapas jugadas (1..8)
    for (let i = 1; i <= 8; i++) {
        const snapshot = generateSnapshot(i);
        await supabase.from('etapas').update({
            archivo_excel: JSON.stringify(snapshot)
        }).eq('id', i);
    }

    console.log('🎉 Snapshots acumulados de clasificación actualizados hasta la Etapa 8.');
}

runEtapa8().catch(err => {
    console.error('💥 Error durante el proceso:', err);
    process.exit(1);
});
