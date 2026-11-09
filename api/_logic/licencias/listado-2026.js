const { supabase } = require('../../../lib/supabase');

/**
 * GET /api/licencias/listado-2026
 * Devuelve el listado de todos los jugadores con licencia oficial activa (2026 y/o 2027),
 * indicando qué temporadas tienen abonadas.
 */
module.exports = async function listarLicenciados(req, res) {
    try {
        const [{ data: jugadores, error: errJug }, { data: licencias, error: errLic }] = await Promise.all([
            supabase
                .from('jugadores')
                .select('id, nombre_completo, nickname, categorias_calculadas, anio_licencia, email, tiene_licencia')
                .order('nombre_completo', { ascending: true }),
            supabase
                .from('licencias')
                .select('jugador_id, anio, estado, fecha_compra')
                .eq('estado', 'pagada')
        ]);

        if (errJug) throw errJug;
        if (errLic) throw errLic;

        // Mapa de jugador_id -> Set de años de licencia pagada
        const aniosPorJugador = new Map();
        for (const lic of (licencias || [])) {
            if (!aniosPorJugador.has(lic.jugador_id)) {
                aniosPorJugador.set(lic.jugador_id, new Set());
            }
            aniosPorJugador.get(lic.jugador_id).add(Number(lic.anio));
        }

        // Filtrar jugadores con licencia vigente 2026 o con licencia pagada registrada (2026 / 2027)
        const filtrados = (jugadores || []).filter(j => {
            const setAnios = aniosPorJugador.get(j.id);
            return j.tiene_licencia === true || (setAnios && setAnios.size > 0);
        });

        // Formatear la respuesta manteniendo compatibilidad y añadiendo temporadas activas
        const listado = filtrados.map(j => {
            const setAnios = new Set(aniosPorJugador.get(j.id) || []);
            if (j.tiene_licencia === true && !setAnios.has(2026) && (j.anio_licencia == null || j.anio_licencia <= 2026)) {
                setAnios.add(2026);
            }
            const licenciasAnios = Array.from(setAnios).sort((a, b) => b - a);

            return {
                nombre: j.nombre_completo || j.nickname,
                nickname: j.nickname,
                categorias: j.categorias_calculadas || [],
                desde: j.anio_licencia || (setAnios.has(2026) ? 2026 : 2027),
                tiene_2026: setAnios.has(2026),
                tiene_2027: setAnios.has(2027),
                licencias_anios: licenciasAnios,
                hash_email: j.email ? Buffer.from(j.email).toString('base64').substring(0, 8) : ''
            };
        }).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));

        return res.status(200).json(listado);
    } catch (e) {
        console.error('Error listando licenciados:', e);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
