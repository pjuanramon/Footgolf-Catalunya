// ============================================================
// POST /api/clasificacion/procesar-etapa
// Procesa los resultados de una etapa con soporte para desempates y vista previa.
// { etapa_id, excel_base64, mode: 'preview'|'commit', desempates: { cat: { score: winner_id } } }
// ============================================================
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

        // 1. Obtener datos
        const { data: etapa } = await supabase.from('etapas').select('*').eq('id', etapa_id).single();
        const { data: dbPlayers } = await supabase.from('jugadores').select('*');
        if (!etapa) return res.status(404).json({ error: 'Etapa no encontrada.' });

        // 2. Leer Excel
        const buffer = Buffer.from(excel_base64, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' }).slice(1);

        // 3. Emparejar jugadores
        const resultadosBrutos = [];
        for (const row of rows) {
            const rawName = String(row['D'] || '').trim();
            if (!rawName) continue;
            // Omitir si el software marcó que no tiene licencia (Columna F)
            if (String(row['F']).trim().toUpperCase() === 'NO') continue;

            const match = matchPlayerToDb(rawName, dbPlayers || []);
            const p = match.player;
            
            // Aplicar ajuste de desempate si existe
            let finalScore = Number(row['Y'] || 0);
            if (p && desempates && desempates[p.id]) {
                // Si este jugador ganó un desempate en alguna categoría, le restamos 0.1 al score para que el engine lo ordene primero
                finalScore -= 0.1;
            }

            resultadosBrutos.push({
                rawName,
                score: finalScore,
                originalScore: Number(row['Y'] || 0),
                dbPlayer: p
            });
        }

        // 4. Calcular Puntos de la Etapa
        const puntosEtapa = calcularPuntosEtapa(resultadosBrutos);

        // 5. Detectar Empates en Top 3 (Solo para modo preview)
        const empatesTop3 = [];
        if (mode === 'preview') {
            const categorias = ['Absoluta', 'Rookie', 'Senior 45 +', 'Senior 55 +', 'Damas', 'Junior'];
            categorias.forEach(cat => {
                // Agrupar por score original (sin el ajuste de -0.1) para ver quién empató realmente
                const sorted = puntosEtapa
                    .filter(r => r.puntos[cat] !== undefined)
                    .sort((a, b) => a.score - b.score);
                
                // Buscar si en los puestos 1, 2 o 3 hay Scores idénticos
                const seenScores = {};
                sorted.forEach((r, idx) => {
                    if (idx < 5) { // Revisamos el top 5 por si acaso para detectar el top 3 real
                        const score = r.score;
                        if (!seenScores[score]) seenScores[score] = [];
                        seenScores[score].push(r);
                    }
                });

                Object.keys(seenScores).forEach(score => {
                    const grupo = seenScores[score];
                    if (grupo.length > 1) {
                        // Verificar si este empate afecta al podium (rango < 4)
                        // Calculamos el rank del grupo
                        const rankOfGroup = sorted.indexOf(grupo[0]) + 1;
                        if (rankOfGroup <= 3) {
                            empatesTop3.push({
                                categoria: cat,
                                score: score,
                                jugadores: grupo.map(g => ({ id: g.jugador_id, nickname: g.nickname }))
                            });
                        }
                    }
                });
            });
        }

        // 6. Si es COMMIT, guardar
        if (mode === 'commit') {
            // Guardar resultados_etapas
            for (const r of puntosEtapa) {
                try {
                    await supabase.from('resultados_etapas').upsert({
                        etapa_id: etapa_id,
                        jugador_id: r.jugador_id,
                        puntos_absoluta: r.puntos['Absoluta'] || 0,
                        puntos_rookie: r.puntos['Rookie'] || 0,
                        puntos_senior45: r.puntos['Senior 45 +'] || 0,
                        puntos_senior55: r.puntos['Senior 55 +'] || 0,
                        puntos_damas: r.puntos['Damas'] || 0,
                        puntos_junior: r.puntos['Junior'] || 0,
                        score: Number(r.score)
                    }, { onConflict: 'etapa_id, jugador_id' });
                } catch (e) {
                    console.error(`Error guardando resultado de ${r.nickname}:`, e);
                }
            }

            // Recalcular General y actualizar JSON en la etapa
            const { data: todosLosResultados } = await supabase
                .from('resultados_etapas')
                .select('*, jugadores(nickname)')
                .order('etapa_id', { ascending: true });

            const general = calcularClasificacionGeneral(todosLosResultados);
            
            const categoriasFinal = { 'Absoluta': [], 'Rookie': [], 'Senior 45 +': [], 'Senior 55 +': [], 'Damas': [], 'Junior': [] };
            Object.keys(categoriasFinal).forEach(cat => {
                const rankingCat = general.map(j => {
                    const catData = j.categorias[cat] || { total: 0, etapas: [] };
                    return { 
                        name: j.nickname, 
                        total: catData.total, 
                        pos: 0,
                        ...catData // Spread to include e1, e2, e3... from the engine
                    };
                }).filter(j => j.total > 0).sort((a, b) => b.total - a.total);
                rankingCat.forEach((p, idx) => p.pos = idx + 1);
                categoriasFinal[cat] = rankingCat;
            });

            const finalJson = { jornada: etapa_id, ultima_actualizacion: new Date().toISOString(), categorias: categoriasFinal };
            await supabase.from('etapas').update({ archivo_excel: JSON.stringify(finalJson), estado: 'finalizada' }).eq('id', etapa_id);

            return res.status(200).json({ ok: true, message: 'Etapa finalizada con éxito.' });
        }

        // 7. Si es PREVIEW, devolver datos para el frontend
        return res.status(200).json({
            ok: true,
            mode: 'preview',
            empatesDetectados: empatesTop3,
            puntosCalculados: puntosEtapa
        });

    } catch (error) {
        console.error('Error procesando clasificación:', error);
        return res.status(500).json({ error: 'Error interno: ' + error.message });
    }
};
