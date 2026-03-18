// ============================================================
// POST /api/admin/override-precio-licencia
// Permite al admin establecer un precio manual de licencia
// ============================================================
const { supabase } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    // Verificar auth admin
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ error: 'No autorizado.' });
    }

    try {
        const { jugador_id, email, nickname, precio } = req.body;

        if (precio === undefined || precio === null) {
            return res.status(400).json({ error: 'El precio es obligatorio.' });
        }

        // Buscar jugador por ID, email o nickname
        let query = supabase.from('jugadores').select('*');

        if (jugador_id) {
            query = query.eq('id', jugador_id);
        } else if (email) {
            query = query.eq('email', email.trim().toLowerCase());
        } else if (nickname) {
            query = query.eq('nickname', nickname.trim());
        } else {
            return res.status(400).json({ error: 'Debes proporcionar jugador_id, email o nickname.' });
        }

        const { data: jugador, error: findError } = await query.single();

        if (findError || !jugador) {
            return res.status(404).json({ error: 'Jugador no encontrado.' });
        }

        // Actualizar override de precio
        const { error: updateError } = await supabase
            .from('jugadores')
            .update({ override_precio_licencia: precio === 0 ? 0 : (precio || null) })
            .eq('id', jugador.id);

        if (updateError) throw updateError;

        return res.status(200).json({
            ok: true,
            jugador: jugador.nickname,
            precioOverride: precio
        });

    } catch (error) {
        console.error('Error en override precio:', error);
        return res.status(500).json({ error: 'Error interno.' });
    }
};
