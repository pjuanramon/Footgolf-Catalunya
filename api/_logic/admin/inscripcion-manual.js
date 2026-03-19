const { supabase } = require('../../../lib/supabase');

/**
 * POST /api/admin/inscripcion-manual
 * { etapa_id, jugador_id, equipo_nombre (opcional) }
 */
module.exports = async function inscripcionManual(req, res) {
    try {
        const { etapa_id, jugador_id, equipo_nombre } = req.body;
        if (!etapa_id || !jugador_id) return res.status(400).json({ error: 'Faltan parámetros' });

        const { data, error } = await supabase
            .from('inscripciones')
            .upsert({
                etapa_id,
                jugador_id,
                equipo_nombre: equipo_nombre || null,
                estado_pago: 'completado'
            }, { onConflict: 'etapa_id, jugador_id' })
            .select();

        if (error) throw error;
        return res.status(200).json({ ok: true, data });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
