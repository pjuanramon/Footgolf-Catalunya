// ============================================================
// POST /api/admin/abrir-etapa
// Abre una etapa para inscripciones + envía email + programa cierre
// ============================================================
const { supabase } = require('../../lib/supabase');
const { enviarAperturaEtapa, enviarCierreEtapa } = require('../../lib/email');
const {
    calcularFechaCierre,
    calcularFechaRecordatorioCierre,
    obtenerTodosLosJugadores
} = require('../../lib/stage-automation');

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
        const { etapa_id } = req.body;

        if (!etapa_id) {
            return res.status(400).json({ error: 'etapa_id es obligatorio.' });
        }

        // Verificar que la etapa existe
        const { data: etapa, error: etapaError } = await supabase
            .from('etapas')
            .select('*')
            .eq('id', etapa_id)
            .single();

        if (etapaError || !etapa) {
            return res.status(404).json({ error: 'Etapa no encontrada.' });
        }

        if (etapa.estado === 'abierta') {
            return res.status(400).json({ error: 'La etapa ya está abierta.' });
        }

        // Abrir la etapa
        const { error: updateError } = await supabase
            .from('etapas')
            .update({ estado: 'abierta' })
            .eq('id', etapa_id);

        if (updateError) throw updateError;

        // Calcular fechas
        const fechaCierre = calcularFechaCierre(etapa.fecha);
        const fechaRecordatorio = calcularFechaRecordatorioCierre(etapa.fecha);

        // Enviar email de apertura
        let emailEnviado = false;
        try {
            const jugadores = await obtenerTodosLosJugadores();
            await enviarAperturaEtapa({ ...etapa, estado: 'abierta' }, jugadores);
            emailEnviado = true;
        } catch (emailErr) {
            console.error('Error enviando email apertura:', emailErr.message);
        }

        return res.status(200).json({
            ok: true,
            etapa: {
                id: etapa.id,
                nombre: etapa.nombre,
                estado: 'abierta'
            },
            fechaCierre: fechaCierre.toISOString(),
            fechaRecordatorioCierre: fechaRecordatorio.toISOString(),
            emailAperturaEnviado: emailEnviado,
            nota: 'Recuerda programar el email de cierre (Vercel Cron o manualmente) para ' + fechaRecordatorio.toISOString()
        });

    } catch (error) {
        console.error('Error abriendo etapa:', error);
        return res.status(500).json({ error: 'Error interno.' });
    }
};
