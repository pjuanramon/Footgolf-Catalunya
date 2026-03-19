const { supabase } = require('../../../lib/supabase');

/**
 * POST /api/admin/modificar-etapa
 * { id, estado }
 */
module.exports = async function modificarEtapa(req, res) {
    try {
        const { id, estado } = req.body;
        if (!id || !estado) return res.status(400).json({ error: 'Faltan parámetros' });

        const { data, error } = await supabase
            .from('etapas')
            .update({ estado })
            .eq('id', id)
            .select();

        if (error) throw error;
        return res.status(200).json({ ok: true, data });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
