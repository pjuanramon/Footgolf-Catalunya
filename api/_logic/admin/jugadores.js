const { supabase } = require('../../../lib/supabase');

/**
 * GET /api/admin/jugadores
 * Lista todos los jugadores con sus datos y licencias.
 */
module.exports = async function getJugadores(req, res) {
    try {
        const { data: jugadores, error } = await supabase
            .from('jugadores')
            .select('*')
            .order('nickname', { ascending: true });

        if (error) throw error;
        return res.status(200).json(jugadores);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
