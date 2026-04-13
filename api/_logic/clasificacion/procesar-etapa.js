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

            const isSalazar = rawName.toLowerCase().includes('salazar');
            const isAbril = rawName.toLowerCase().includes('abril');
            if (isSalazar || isAbril) logs.push(`DEBUG DEBUG: Encontrado en fila: "${rawName}"`);

            const match = matchPlayerToDb(rawName, dbPlayers || []);
            const p = match.player;

            // PRIORIDAD 1: Si lo encontramos en la DB y tiene licencia, LO INCLUIMOS.
            let tieneLicenciaValida = false;
            if (p) {
                tieneLicenciaValida = p.tiene_licencia;
                if (isSalazar || isAbril) logs.push(`DEBUG DEBUG: Matcheado en DB como ${p.nickname}. Tiene licencia DB: ${p.tiene_licencia}`);
            } else {
                // Si no está en DB, confiamos en la columna F del Excel
                tieneLicenciaValida = String(row['F']).trim().toUpperCase() !== 'NO';
                if (isSalazar || isAbril) logs.push(`DEBUG DEBUG: NO matcheado en DB. Usando Excel Col F: ${tieneLicenciaValida}`);
            }

            if (!tieneLicenciaValida) {
                if (isSalazar || isAbril) logs.push(`DEBUG DEBUG: Ignorado por no tener licencia válida.`);
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
        
        if (mode === 'preview') {
            categorias.forEach(cat => {
                const sorted = puntosEtapa.filter(r => r.puntos[cat] !== undefined).sort((a, b) => {
                    if (a.score !== b.score) return a.score - b.score;
                    if (a.wonTie && !b.wonTie) return -1;
                    if (!a.wonTie && b.wonTie) return 1;
                    return 0;
                });

                const seenScores = {};
                sorted.forEach((r, idx) => {
                    if (idx < 5) {
                        const score = Number(r.score);
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
        }

        if (mode === 'commit') {
            logs.push(`Iniciando COMMIT...`);
            for (const r of puntosEtapa) {
                try {
                    const { error } = await supabase.from('resultados_etapas').upsert({
                        etapa_id: etapa_id, jugador_id: r.jugador_id,
                        puntos_absoluta: r.puntos['Absoluta'] || 0, puntos_rookie: r.puntos['Rookie'] || 0,
                        puntos_senior45: r.puntos['Senior 45 +'] || 0, puntos_senior55: r.puntos['Senior 55 +'] || 0,
                        puntos_femenino: r.puntos['Damas'] || 0, puntos_junior: r.puntos['Junior'] || 0,
                        score: Math.round(Number(r.score))
                    }, { onConflict: 'etapa_id, jugador_id' });
                    if (error) logs.push(`ERROR UPSERT ${r.nickname}: ${error.message}`);
                } catch (e) {
                    logs.push(`EXCEPTION UPSERT ${r.nickname}: ${e.message}`);
                }
            }

            const { data: todosLosResultados } = await supabase.from('resultados_etapas').select('*, jugadores(nickname)').order('etapa_id', { ascending: true });
            const general = calcularClasificacionGeneral(todosLosResultados);
            const categoriasFinal = { 'Absoluta': [], 'Rookie': [], 'Senior 45 +': [], 'Senior 55 +': [], 'Damas': [], 'Junior': [] };
            Object.keys(categoriasFinal).forEach(cat => {
                const rankingCat = general.map(j => {
                    const catData = j.categorias[cat] || { total: 0, etapas: [] };
                    return { name: j.nickname, total: catData.total, pos: 0, ...catData };
                }).filter(j => j.total > 0).sort((a, b) => b.total - a.total);
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
