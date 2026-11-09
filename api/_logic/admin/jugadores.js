const { supabase } = require('../../../lib/supabase');

/**
 * GET /api/admin/jugadores
 * Lista todos los jugadores con sus datos y temporadas de licencia pagadas.
 */
module.exports = async function getJugadores(req, res) {
    try {
        const [{ data: jugadores, error }, { data: licencias, error: licErr }] = await Promise.all([
            supabase
                .from('jugadores')
                .select('*')
                .order('nickname', { ascending: true }),
            supabase
                .from('licencias')
                .select('jugador_id, anio, estado, fecha_compra')
                .eq('estado', 'pagada')
        ]);

        if (error) throw error;
        if (licErr) throw licErr;

        const mapLic = new Map();
        for (const l of (licencias || [])) {
            if (!mapLic.has(l.jugador_id)) mapLic.set(l.jugador_id, []);
            mapLic.get(l.jugador_id).push(Number(l.anio));
        }

        const enriched = (jugadores || []).map(j => ({
            ...j,
            licencias_anios: Array.from(new Set(mapLic.get(j.id) || [])).sort((a, b) => b - a)
        }));

        return res.status(200).json(enriched);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
