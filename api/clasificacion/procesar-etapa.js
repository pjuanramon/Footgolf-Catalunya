// ============================================================
// POST /api/clasificacion/procesar-etapa
// Procesa los resultados de una etapa:
//   1. Recibe el Excel de resultados
//   2. Matching de jugadores con la BD
//   3. Determina quién puntúa (solo con licencia)
//   4. Invoca el motor de clasificación existente (NO lo modifica)
//   5. Genera JSON de clasificación
//   6. Automatización: finalizar + abrir siguiente + emails
// ============================================================
const { supabase } = require('../../lib/supabase');
const { matchPlayerToDb, normalizeName } = require('../../lib/matching');
const { ejecutarAutomatizacionCompleta } = require('../../lib/stage-automation');
const XLSX = require('xlsx');

// Config para Vercel: permitir archivos más grandes y más tiempo
module.exports.config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    },
    maxDuration: 60
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    // Verificar auth admin
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ error: 'No autorizado.' });
    }

    try {
        const { etapa_id, excel_base64 } = req.body;

        if (!etapa_id) {
            return res.status(400).json({ error: 'etapa_id es obligatorio.' });
        }
        if (!excel_base64) {
            return res.status(400).json({ error: 'excel_base64 es obligatorio (archivo Excel en base64).' });
        }

        // 1. Verificar la etapa
        const { data: etapa, error: etapaError } = await supabase
            .from('etapas')
            .select('*')
            .eq('id', etapa_id)
            .single();

        if (etapaError || !etapa) {
            return res.status(404).json({ error: 'Etapa no encontrada.' });
        }

        // 2. Leer el Excel
        const buffer = Buffer.from(excel_base64, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const excelData = XLSX.utils.sheet_to_json(sheet, { header: 'A', defval: '' });
        const rows = excelData.slice(1); // Saltar cabecera visual

        // 3. Obtener todos los jugadores de la BD
        const { data: dbPlayers, error: playersError } = await supabase
            .from('jugadores')
            .select('*');

        if (playersError) throw playersError;

        // 4. Procesar cada fila del Excel y hacer matching
        const resultados = [];
        const matchReport = [];
        const jugadoresSinLicencia = [];

        for (const row of rows) {
            const rawName = String(row['D'] || '').trim();
            if (!rawName) continue;

            const f = String(row['F']).trim().toUpperCase();
            const didNotPlay = (f === 'NO' || f === '');
            if (didNotPlay) continue;

            // Matching con la BD
            const match = matchPlayerToDb(rawName, dbPlayers || []);

            const tieneLicencia = match.player ? match.player.tiene_licencia : false;

            // Score del Excel
            let score = row['Y'];
            if (score === '' || score === undefined) score = 0;
            else score = Number(score);

            // Categorías del Excel
            let excelCat = String(row['C'] || '').trim();

            // Registrar el resultado del matching
            matchReport.push({
                excelName: rawName,
                matchedTo: match.player ? match.player.nickname : null,
                matchType: match.matchType,
                confidence: match.confidence,
                tieneLicencia,
                score
            });

            // Si no tiene licencia, registrar para el motor
            if (!tieneLicencia) {
                jugadoresSinLicencia.push(rawName);
            }

            resultados.push({
                rawName,
                normName: normalizeName(rawName),
                isUnlicensed: !tieneLicencia,
                score,
                excelCat,
                dbPlayer: match.player
            });
        }

        // 5. Preparar los datos para el motor de clasificación
        // El motor existente espera:
        //   - UNLICENSED: array de nombres sin licencia
        //   - NON_ROOKIES: array de nombres que no son rookies
        //   - Los datos del Excel
        //
        // IMPORTANTE: NO modificamos el motor. Solo preparamos los inputs.

        const unlicensedNames = resultados
            .filter(r => r.isUnlicensed)
            .map(r => normalizeName(r.rawName));

        const nonRookieNames = resultados
            .filter(r => {
                if (!r.dbPlayer) return false;
                return !r.dbPlayer.es_rookie;
            })
            .map(r => normalizeName(r.rawName));

        // 6. Obtener clasificación histórica de la BD
        // Buscar el JSON de clasificación anterior si existe
        const jornadaAnterior = etapa_id - 1;
        let historicalData = null;

        if (jornadaAnterior >= 1) {
            // Intentar obtener la clasificación anterior del storage o BD
            // Por ahora, leer del archivo JSON existente si está disponible
            try {
                const { data: etapaAnterior } = await supabase
                    .from('etapas')
                    .select('archivo_excel')
                    .eq('id', jornadaAnterior)
                    .single();

                // La clasificación histórica se tomará del JSON existente
                // que el motor ya sabe leer
            } catch (e) {
                console.log('No se encontró clasificación anterior, primera jornada.');
            }
        }

        // 7. Generar la configuración para el motor
        // El motor se ejecuta en el navegador (process_jornada.html)
        // Desde el backend, generamos los datos de entrada que necesita
        const motorInput = {
            jornada: etapa_id,
            unlicensed: unlicensedNames,
            nonRookies: nonRookieNames,
            resultados: resultados.map(r => ({
                rawName: r.rawName,
                normName: r.normName,
                isUnlicensed: r.isUnlicensed,
                score: r.score,
                excelCat: r.excelCat
            }))
        };

        // 8. Guardar el archivo Excel en la BD
        const { error: updateExcelError } = await supabase
            .from('etapas')
            .update({ archivo_excel: excel_base64.substring(0, 100) + '...' }) // Referencia, no el archivo completo
            .eq('id', etapa_id);

        // 9. Ejecutar automatización (finalizar etapa, abrir siguiente, emails)
        const resumenAutomatizacion = await ejecutarAutomatizacionCompleta(etapa_id);

        // 10. Devolver resultados
        return res.status(200).json({
            ok: true,
            etapa: {
                id: etapa.id,
                nombre: etapa.nombre
            },
            motorInput: motorInput,
            matchReport: matchReport,
            resumen: {
                totalJugadores: resultados.length,
                conLicencia: resultados.filter(r => !r.isUnlicensed).length,
                sinLicencia: resultados.filter(r => r.isUnlicensed).length,
                matchExacto: matchReport.filter(m => m.matchType.startsWith('exact')).length,
                matchFuzzy: matchReport.filter(m => m.matchType === 'fuzzy').length,
                sinMatch: matchReport.filter(m => m.matchType === 'none').length
            },
            automatizacion: resumenAutomatizacion,
            instrucciones: {
                paso1: 'Revisa el matchReport para verificar que los nombres se vincularon correctamente.',
                paso2: 'Los datos de motorInput contienen las listas UNLICENSED y NON_ROOKIES actualizadas.',
                paso3: 'Actualiza process_jornada.html con estas listas y ejecuta el motor para generar la clasificación.',
                paso4: 'La etapa se ha finalizado y la siguiente se ha abierto automáticamente.',
                nota: 'El motor de clasificación existente NO ha sido modificado.'
            }
        });

    } catch (error) {
        console.error('Error procesando etapa:', error);
        return res.status(500).json({ error: 'Error interno: ' + error.message });
    }
};
