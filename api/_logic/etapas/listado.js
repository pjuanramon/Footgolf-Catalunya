// ============================================================
// GET /api/etapas/listado
// Lista las etapas (opcionalmente filtradas por estado)
// ============================================================
const { supabase } = require('../../../lib/supabase');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { estado } = req.query;

        let query = supabase
            .from('etapas')
            .select('*')
            .order('fecha', { ascending: true });

        if (estado) {
            const states = estado.split(',');
            if (states.length > 1) {
                query = query.in('estado', states);
            } else {
                query = query.eq('estado', estado);
            }
        }

        const { data, error } = await query;

        if (error) throw error;

        return res.status(200).json(data || []);

    } catch (error) {
        console.error('Error listando etapas:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
