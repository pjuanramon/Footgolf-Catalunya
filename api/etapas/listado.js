// ============================================================
// GET /api/etapas/listado
// Lista las etapas (opcionalmente filtradas por estado)
// ============================================================
const { supabase } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { estado } = req.query;

        let query = supabase
            .from('etapas')
            .select('*')
            .order('id', { ascending: true });

        if (estado) {
            query = query.eq('estado', estado);
        }

        const { data, error } = await query;

        if (error) throw error;

        return res.status(200).json(data || []);

    } catch (error) {
        console.error('Error listando etapas:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
