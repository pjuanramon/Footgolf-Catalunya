const { supabase } = require('../../../lib/supabase');

/**
 * GET /api/licencias/listado-2026
 * Devuelve el listado de todos los jugadores que ya tienen licencia activa para 2026.
 */
module.exports = async function listarLicenciados(req, res) {
    try {
        const { data, error } = await supabase
            .from('jugadores')
            .select('nombre_completo, nickname, categorias_calculadas, anio_licencia, email')
            .eq('tiene_licencia', true)
            .order('nombre_completo', { ascending: true });

        if (error) throw error;

        // Formatear la respuesta
        const listado = data.map(j => ({
            nombre: j.nombre_completo || j.nickname,
            categorias: j.categorias_calculadas || [],
            desde: j.anio_licencia || 2026,
            hash_email: btoa(j.email).substring(0, 8) // Para un ID único visual (opcional)
        }));

        return res.status(200).json(listado);
    } catch (e) {
        console.error('Error listando licenciados:', e);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
