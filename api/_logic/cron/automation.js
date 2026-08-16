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
        errores: []
    };

    try {
        // 1. Buscar todas las etapas abiertas
        const { data: etapas, error: etapasError } = await supabase
            .from('etapas')
            .select('*')
            .eq('estado', 'abierta');

        if (etapasError) throw etapasError;

        for (const etapa of etapas) {
            const fechaCierre = etapa.fecha_cierre_inscripcion 
                ? new Date(etapa.fecha_cierre_inscripcion) 
                : calcularFechaCierre(etapa);
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
            // Para simplificar, enviamos si estamos en la ventana de tiempo (p.ej. el jueves)
            // El cron debería correr una vez al día para no duplicar, o marcar en la BD que ya se envió.
            else if (ahora >= fechaRecordatorio) {
                // Aquí podríamos añadir una columna 'recordatorio_enviado' a la tabla etapas
                // Por ahora, asumimos que el cron corre a una hora específica y lo enviamos
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
