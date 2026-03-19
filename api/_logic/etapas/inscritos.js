const { supabase } = require('../../../lib/supabase');

/**
 * GET /api/etapas/inscritos?etapa_id=...
 * Devuelve la lista de nicknames de jugadores inscritos y pagados.
 */
module.exports = async function listarInscritos(req, res) {
    try {
        const { etapa_id } = req.query;
        if (!etapa_id) return res.status(400).json({ error: 'Falta etapa_id.' });

        const { data, error } = await supabase
            .from('inscripciones')
            .select('jugador:jugadores(nickname), equipo_nombre')
            .eq('etapa_id', etapa_id)
            .eq('estado', 'pagada');

        if (error) throw error;

        // Formatear para devolver solo nicknames (y equipo si es relevante)
        const inscritos = data.map(i => ({
            nickname: i.jugador.nickname,
            equipo: i.equipo_nombre
        }));

        return res.status(200).json(inscritos);
    } catch (e) {
        console.error('Error listando inscritos:', e);
        return res.status(500).json({ error: 'Error interno.' });
    }
};
