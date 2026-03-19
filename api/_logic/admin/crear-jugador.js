const { supabase } = require('../../../lib/supabase');

/**
 * POST /api/admin/crear-jugador
 * { nombre_completo, nickname, email }
 */
module.exports = async function crearJugador(req, res) {
    try {
        const { nombre_completo, nickname, email, telefono, fecha_nacimiento, genero, club } = req.body;
        if (!nombre_completo || !nickname || !email) return res.status(400).json({ error: 'Faltan parámetros' });

        const { data, error } = await supabase
            .from('jugadores')
            .insert({
                nombre_completo,
                nickname,
                email,
                telefono: telefono || null,
                fecha_nacimiento: fecha_nacimiento || null,
                genero: genero || null,
                club: club || 'Independiente',
                tiene_licencia: false // Por defecto sin licencia
            })
            .select();

        if (error) throw error;
        return res.status(200).json({ ok: true, data });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
