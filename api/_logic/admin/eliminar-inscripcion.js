const { supabase } = require('../../../lib/supabase');

/**
 * POST /api/admin/eliminar-inscripcion
 * { id } - El ID de la inscripción
 */
module.exports = async function eliminarInscripcion(req, res) {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Falta ID de inscripción' });

        const { error } = await supabase
            .from('inscripciones')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return res.status(200).json({ ok: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
