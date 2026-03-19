const { supabase } = require('../../../lib/supabase');

/**
 * GET /api/jugadores/buscar?email=...
 * Busca un jugador por email y devuelve su nickname.
 */
module.exports = async function buscarJugador(req, res) {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: 'Falta el email.' });

        const { data: jugador, error } = await supabase
            .from('jugadores')
            .select('nickname, id, tiene_licencia, club')
            .eq('email', email.trim().toLowerCase())
            .single();

        if (error || !jugador) {
            return res.status(404).json({ error: 'Jugador no encontrado.' });
        }

        // Caso especial para el admin (JuanRa) para que el frontend sepa que el precio cambia
        const isJuanRa = ['pjuanramon@hotmail.com', 'juanra@footgolfcatalunya.com'].includes(email.trim().toLowerCase());

        return res.status(200).json({ 
            nickname: jugador.nickname,
            tiene_licencia: jugador.tiene_licencia,
            isJuanRa: isJuanRa
        });
    } catch (e) {
        return res.status(500).json({ error: 'Error interno.' });
    }
};
