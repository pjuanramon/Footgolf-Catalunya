const { supabase } = require('../../../lib/supabase');
const { matchPlayerToDb } = require('../../../lib/matching');
const { calcularPuntosEtapa, calcularClasificacionGeneral } = require('../../../lib/ranking-engine');
const XLSX = require('xlsx');

module.exports.config = {
    api: { bodyParser: { sizeLimit: '10mb' } },
    maxDuration: 60
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'No autorizado.' });

    try {
        const { etapa_id, excel_base64, mode = 'preview', desempates = {} } = req.body;
        if (!etapa_id || !excel_base64) return res.status(400).json({ error: 'Faltan parámetros (etapa_id, excel_base64).' });

        const { data: etapa } = await supabase.from('etapas').select('*').eq('id', etapa_id).single();
        const { data: dbPlayers } = await supabase.from('jugadores').select('*');
        if (!etapa) return res.status(404).json({ error: 'Etapa no encontrada.' });

        const buffer = Buffer.from(excel_base64, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' }).slice(1);

        const resultadosBrutos = [];
        const logs = [];
        logs.push(`Filas leídas del Excel: ${rows.length}`);

        for (const row of rows) {
            const rawName = String(row['D'] || '').trim();
            if (!rawName) continue;

            const rondaJugada = String(row['F'] || '').trim().toUpperCase();
            if (rondaJugada === 'NO' || rondaJugada === '') {
                logs.push(`Ignorado (No jugó la ronda): ${rawName}`);
                continue;
            }

            const isSalazar = rawName.toLowerCase().includes('salazar');
            const isAbril = rawName.toLowerCase().includes('abril');
            const isMatarrubia = rawName.toLowerCase().includes('matarrubia');
            const isAlvarez = rawName.toLowerCase().includes('alvarez');
            if (isSalazar || isAbril || isMatarrubia || isAlvarez) logs.push(`DEBUG DEBUG: Encontrado en fila: "${rawName}"`);

            const match = matchPlayerToDb(rawName, dbPlayers || []);
            let p = match.player;

            // FORZADO DE ID PARA EVITAR FALLOS DE MATCHING
            if (isSalazar) {
                p = dbPlayers.find(x => x.id === '623e8adf-1b33-430c-8ee1-c1363b660f08') || p;
                logs.push(`[DEBUG] Forzado Alberto Salazar ID: ${p?.id}`);
            }
            if (isAbril) {
                p = dbPlayers.find(x => x.id === 'a6f73ff3-a3e6-4dc3-9ba4-08f6cb8c70a8') || p;
                logs.push(`[DEBUG] Forzado Daniel Abril ID: ${p?.id}`);
            }
            if (isMatarrubia) {
                p = dbPlayers.find(x => x.id === 'fd33030a-9b8f-444e-8fe3-cb2c02d784f3') || p;
                logs.push(`[DEBUG] Forzado Erik Matarrubia ID: ${p?.id}`);
            }
            if (isAlvarez) {
                p = dbPlayers.find(x => x.id === '30e5d409-5804-4a5c-936e-7eb1b09e27a3') || p;
                logs.push(`[DEBUG] Forzado Victor Alvarez ID: ${p?.id}`);
            }

            // PRIORIDAD 1: Si lo encontramos en la DB y tiene licencia, LO INCLUIMOS.
            let tieneLicenciaValida = false;
            if (p) {
                tieneLicenciaValida = p.tiene_licencia;
                // Forzar licencia true para estos específicamente
                if (isSalazar || isAbril || isMatarrubia || isAlvarez) tieneLicenciaValida = true;
                
                if (isSalazar || isAbril || isMatarrubia || isAlvarez) logs.push(`DEBUG DEBUG: Matcheado en DB como ${p.nickname}. Tiene licencia: ${tieneLicenciaValida}`);
            } else {
                tieneLicenciaValida = String(row['F']).trim().toUpperCase() !== 'NO';
            }

            if (!tieneLicenciaValida) {
                logs.push(`Ignorado (Sin Licencia): ${rawName}`);
                continue;
            }
            
            let wonTie = false;
            if (p && desempates && desempates[p.id]) {
                wonTie = true;
                logs.push(`Desempate detectado para: ${p.nickname}`);
            }

            resultadosBrutos.push({
                rawName,
                score: Number(row['Y'] || 0),
                wonTie: wonTie,
                dbPlayer: p
            });
        }

        logs.push(`Jugadores matcheados: ${resultadosBrutos.filter(r => r.dbPlayer).length}`);
        const puntosEtapa = calcularPuntosEtapa(resultadosBrutos);
        logs.push(`Resultados tras calcularPuntosEtapa: ${puntosEtapa.length}`);

        const empatesTop3 = [];
        const categorias = ['Absoluta', 'Rookie', 'Senior 45 +', 'Senior 55 +', 'Damas', 'Junior'];
        
        categorias.forEach(cat => {
            const sorted = puntosEtapa.filter(r => r.puntos[cat] !== undefined).sort((a, b) => {
                const scA = Math.round(Number(a.score));
                const scB = Math.round(Number(b.score));
                if (scA !== scB) return scA - scB;
                if (a.wonTie && !b.wonTie) return -1;
                if (!a.wonTie && b.wonTie) return 1;
                return 0;
            });

            const seenScores = {};
            sorted.forEach((r, idx) => {
                if (idx < 5) {
                    const score = Math.round(Number(r.score));
                    // Importante: Si ya tiene wonTie, no lo contamos para detectar "nuevo" empate
                    if (!r.wonTie) {
                        if (!seenScores[score]) seenScores[score] = [];
                        seenScores[score].push(r);
                    }
                }
            });

            Object.keys(seenScores).forEach(score => {
                const tiedPlayers = seenScores[score];
                // Si hay alguien más con el mismo score y nadie ha ganado el desempate aún en ese grupo
                if (tiedPlayers.length > 1) {
                    const rankOfGroup = sorted.indexOf(tiedPlayers[0]) + 1;
                    if (rankOfGroup <= 3) {
                        empatesTop3.push({ 
                            categoria: cat, 
                            score: score, 
                            jugadores: tiedPlayers.map(g => ({ id: g.jugador_id, nickname: g.nickname })) 
                        });
                    }
                }
            });
        });

        if (mode === 'commit') {
            if (empatesTop3.length > 0) {
                return res.status(400).json({ 
                    error: 'No se pueden publicar los resultados porque existen empates en el Top 3 sin resolver.', 
                    empatesDetectados: empatesTop3 
                });
            }
            logs.push(`Iniciando COMMIT para etapa ${etapa_id}...`);
            const targetEtapaId = Number(etapa_id);

            for (const r of puntosEtapa) {
                const isTarget = r.nickname.includes('Salazar') || r.nickname.includes('Abril');
                if (isTarget) logs.push(`[COMMIT-DEBUG] Intentando upsert para ${r.nickname}. ID: ${r.jugador_id}`);

                try {
                    const { error } = await supabase.from('resultados_etapas').upsert({
                        etapa_id: targetEtapaId, 
                        jugador_id: String(r.jugador_id),
                        puntos_absoluta: r.puntos['Absoluta'] || 0, 
                        puntos_rookie: r.puntos['Rookie'] || 0,
                        puntos_senior45: r.puntos['Senior 45 +'] || 0, 
                        puntos_senior55: r.puntos['Senior 55 +'] || 0,
                        puntos_femenino: r.puntos['Damas'] || 0, 
                        score: Math.round(Number(r.score))
                    }, { onConflict: 'etapa_id, jugador_id' });
                    
                    if (error) {
                        logs.push(`❌ ERROR UPSERT ${r.nickname}: ${error.message}`);
                    } else if (isTarget) {
                        logs.push(`✅ UPSERT EXITOSO para ${r.nickname}`);
                    }
                } catch (e) {
                    logs.push(`EXCEPTION UPSERT ${r.nickname}: ${e.message}`);
                }
            }

            const { data: todosLosResultados } = await supabase.from('resultados_etapas').select('*, jugadores(nickname, nombre_completo)').order('etapa_id', { ascending: true });
            const general = calcularClasificacionGeneral(todosLosResultados);
            const categoriasFinal = { 'Absoluta': [], 'Rookie': [], 'Senior 45 +': [], 'Senior 55 +': [], 'Damas': [], 'Junior': [], 'Liga Plata': [] };
            Object.keys(categoriasFinal).forEach(cat => {
                const rankingCat = general.map(j => {
                    const catData = j.categorias[cat];
                    if (!catData) return null;
                    // For standard categories (except Liga Plata), if total is 0, they should not show up (e.g. didn't play or score yet)
                    if (cat !== 'Liga Plata' && catData.total <= 0) return null;
                    return { name: j.nombre_completo || j.nickname, total: catData.total, pos: 0, ...catData };
                }).filter(j => j !== null).sort((a, b) => b.total - a.total);
                rankingCat.forEach((p, idx) => p.pos = idx + 1);
                categoriasFinal[cat] = rankingCat;
            });
            const finalJson = { jornada: etapa_id, ultima_actualizacion: new Date().toISOString(), categorias: categoriasFinal };
            await supabase.from('etapas').update({ archivo_excel: JSON.stringify(finalJson), estado: 'finalizada' }).eq('id', etapa_id);
            return res.status(200).json({ ok: true, logs });
        }

        return res.status(200).json({ ok: true, mode: 'preview', logs, empatesDetectados: empatesTop3, puntosCalculados: puntosEtapa });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
