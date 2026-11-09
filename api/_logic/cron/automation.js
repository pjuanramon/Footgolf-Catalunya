// ============================================================
// GET /api/cron/automation
// Endpoint para tareas programadas (Vercel Cron)
// ============================================================
const { supabase } = require('../../../lib/supabase');
const { 
    calcularFechaCierre, 
    calcularFechaRecordatorioCierre,
    obtenerTodosLosJugadores
} = require('../../../lib/stage-automation');
const { enviarCierreEtapa } = require('../../../lib/email');

module.exports = async function handler(req, res) {
    // Verificar que la petición viene de Vercel Cron (o usar admin secret para pruebas)
    const isAdmin = req.headers['x-admin-secret'] === process.env.ADMIN_SECRET;
    const isCron = req.headers['x-vercel-cron'] === '1' || req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`;

    if (!isAdmin && !isCron) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const ahora = new Date();
    const resultados = {
        etapasCerradas: [],
        recordatoriosEnviados: [],
        licenciasSincronizadas: 0,
        errores: []
    };

    try {
        // 0. A partir del 1 de enero de cada nueva temporada (2027+), activar tiene_licencia
        // para quienes pagaron por adelantado (Pronto Pago) sin alterar su anio_licencia histórico.
        const currentYear = ahora.getFullYear();
        if (currentYear >= 2027) {
            const { data: licsAnio } = await supabase
                .from('licencias')
                .select('jugador_id')
                .eq('anio', currentYear)
                .eq('estado', 'pagada');

            const idsConLicencia = Array.from(new Set((licsAnio || []).map(l => l.jugador_id)));
            if (idsConLicencia.length > 0) {
                const { data: pendientesActivar } = await supabase
                    .from('jugadores')
                    .select('id')
                    .in('id', idsConLicencia)
                    .eq('tiene_licencia', false);

                if (pendientesActivar && pendientesActivar.length > 0) {
                    const idsActivar = pendientesActivar.map(p => p.id);
                    await supabase
                        .from('jugadores')
                        .update({ tiene_licencia: true })
                        .in('id', idsActivar);
                    resultados.licenciasSincronizadas = idsActivar.length;
                }
            }
        }

        // 1. Buscar todas las etapas abiertas
        const { data: etapas, error: etapasError } = await supabase
            .from('etapas')
            .select('*')
            .eq('estado', 'abierta');

        if (etapasError) throw etapasError;

        for (const etapa of etapas) {
            // Para inscripciones especiales de temporada 2027 (301/302), cierre el 1 de diciembre a las 23:59 CET
            let fechaCierre;
            if (etapa.fecha_cierre_inscripcion) {
                fechaCierre = new Date(etapa.fecha_cierre_inscripcion);
            } else if (etapa.id === 301 || etapa.id === 302) {
                fechaCierre = new Date('2026-12-01T23:59:59+01:00');
            } else {
                fechaCierre = calcularFechaCierre(etapa);
            }
            const fechaRecordatorio = calcularFechaRecordatorioCierre(etapa);

            // A. ¿Toca cerrar la etapa? (ahora >= fechaCierre)
            if (ahora >= fechaCierre) {
                const { error: closeError } = await supabase
                    .from('etapas')
                    .update({ estado: 'cerrada' })
                    .eq('id', etapa.id);

                if (closeError) {
                    resultados.errores.push(`Error cerrando etapa ${etapa.id}: ${closeError.message}`);
                } else {
                    resultados.etapasCerradas.push(etapa.nombre);
                }
            }
            // B. ¿Toca enviar recordatorio? (ahora > fechaRecordatorio y no enviado aún)
            else if (etapa.id < 300 && ahora >= fechaRecordatorio) {
                try {
                    const jugadores = await obtenerTodosLosJugadores();
                    await enviarCierreEtapa(etapa, jugadores);
                    resultados.recordatoriosEnviados.push(etapa.nombre);
                } catch (err) {
                    resultados.errores.push(`Error enviando recordatorio etapa ${etapa.id}: ${err.message}`);
                }
            }
        }

        return res.status(200).json({ ok: true, resultados });

    } catch (error) {
        console.error('Error en cron de automatización:', error);
        return res.status(500).json({ error: 'Error interno: ' + error.message });
    }
};
