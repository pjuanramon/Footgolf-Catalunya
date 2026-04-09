const { supabase } = require('../../../lib/supabase');

/**
 * GET /api/admin/inscripciones?etapa_id=...
 */
module.exports = async function getInscripciones(req, res) {
    try {
        const { etapa_id } = req.query;
        if (!etapa_id) return res.status(400).json({ error: 'Falta etapa_id' });

        const { data: inscripciones, error } = await supabase
            .from('inscripciones')
            .select('*, jugadores(nickname, tiene_licencia, email)')
            .eq('etapa_id', etapa_id)
            .order('fecha_inscripcion', { ascending: false });

        if (error) throw error;
        return res.status(200).json(inscripciones);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
