// ============================================================
// POST /api/clasificacion/procesar-etapa
// Procesa los resultados de una etapa de forma 100% automatizada
// ============================================================
const { supabase } = require('../../../lib/supabase');
const { matchPlayerToDb, normalizeName } = require('../../../lib/matching');
const { ejecutarAutomatizacionCompleta } = require('../../../lib/stage-automation');
const { calcularPuntosEtapa, calcularClasificacionGeneral } = require('../../../lib/ranking-engine');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

module.exports.config = {
    api: { bodyParser: { sizeLimit: '10mb' } },
    maxDuration: 60
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'No autorizado.' });

    try {
        const { etapa_id, excel_base64 } = req.body;
        if (!etapa_id || !excel_base64) return res.status(400).json({ error: 'Faltan parámetros (etapa_id, excel_base64).' });

        // 1. Obtener datos básicos
        const { data: etapa } = await supabase.from('etapas').select('*').eq('id', etapa_id).single();
        const { data: dbPlayers } = await supabase.from('jugadores').select('*');
        
        if (!etapa) return res.status(404).json({ error: 'Etapa no encontrada.' });

        // 2. Leer Excel
        const buffer = Buffer.from(excel_base64, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' }).slice(1);

        // 3. Preparar resultados para el motor
        const resultadosBrutos = [];
        for (const row of rows) {
            const rawName = String(row['D'] || '').trim();
            if (!rawName) continue;
            if (String(row['F']).trim().toUpperCase() === 'NO') continue;

            const match = matchPlayerToDb(rawName, dbPlayers || []);
            resultadosBrutos.push({
                rawName,
                normName: normalizeName(rawName),
                score: Number(row['Y'] || 0),
                dbPlayer: match.player,
                isUnlicensed: match.player ? !match.player.tiene_licencia : true
            });
        }

        // 4. Calcular Puntos de la Etapa
        const puntosEtapa = calcularPuntosEtapa(resultadosBrutos);

        // 5. Guardar resultados en la BD
        for (const r of puntosEtapa) {
            await supabase.from('resultados_etapas').upsert({
                etapa_id: etapa_id,
                jugador_id: r.jugador_id,
                puntos_absoluta: r.puntos['Absoluta'] || 0,
                puntos_rookie: r.puntos['Rookie'] || 0,
                puntos_senior45: r.puntos['Senior 45 +'] || 0,
                puntos_senior55: r.puntos['Senior 55 +'] || 0,
                puntos_femenino: r.puntos['Femenino'] || 0,
                score: r.score
            }, { onConflict: 'etapa_id, jugador_id' });
        }

        // 6. Generar Clasificación General Automatizada
        const { data: todosLosResultados } = await supabase
            .from('resultados_etapas')
            .select('*, jugadores(nickname, tiene_licencia)')
            .order('etapa_id', { ascending: true });

        const general = calcularClasificacionGeneral(todosLosResultados);

        // Formatear para el frontend (manteniendo compatibilidad con el motor antiguo)
        const categoriasFinal = {
            'Absoluta': [], 'Rookie': [], 'Senior 45 +': [], 'Senior 55 +': [], 'Femenino': []
        };

        Object.keys(categoriasFinal).forEach(cat => {
            const rankingCat = general
                .map(j => {
                    const catData = j.categorias[cat] || { total: 0, etapas: [] };
                    return {
                        name: j.nickname,
                        total: catData.total,
                        e1: catData.etapas[0] || 0,
                        e2: catData.etapas[1] || 0,
                        e3: catData.etapas[2] || 0,
                        e4: catData.etapas[3] || 0,
                        e5: catData.etapas[4] || 0,
                        e6: catData.etapas[5] || 0,
                        e7: catData.etapas[6] || 0,
                        e8: catData.etapas[7] || 0,
                        e9: catData.etapas[8] || 0,
                        e10: catData.etapas[9] || 0,
                        isUnlicensed: false // Solo puntuamos licenciados
                    };
                })
                .filter(j => j.total > 0)
                .sort((a, b) => b.total - a.total);

            rankingCat.forEach((p, idx) => p.pos = idx + 1);
            categoriasFinal[cat] = rankingCat;
        });

        const finalJson = {
            jornada: etapa_id,
            ultima_actualizacion: new Date().toISOString(),
            categorias: categoriasFinal
        };

        // 7. Guardar JSON (Simulamos persistencia en carpeta data para el frontend)
        // En Vercel no podemos escribir en disco de forma persistente fácilmente, 
        // pero podemos devolverlo o guardarlo en Supabase Storage.
        // Por ahora, lo guardamos en Supabase en una columna de la etapa o similar.
        await supabase.from('etapas').update({ archivo_excel: JSON.stringify(finalJson) }).eq('id', etapa_id);

        // 8. Automatización adicional
        const resumenAuto = await ejecutarAutomatizacionCompleta(etapa_id);

        return res.status(200).json({
            ok: true,
            message: 'Etapa procesada y ranking actualizado automáticamente.',
            jornada: etapa_id,
            resumen: resumenAuto,
            data: finalJson // Enviamos el JSON para que el admin lo vea
        });

    } catch (error) {
        console.error('Error procesando clasificación:', error);
        return res.status(500).json({ error: 'Error interno: ' + error.message });
    }
};
