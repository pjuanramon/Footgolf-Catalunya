const { supabase } = require('../../../lib/supabase');

/**
 * GET /api/admin/clasificacion-nombres
 * Extrae la lista única de nicknames que aparecen en los rankings oficiales (archivo_excel).
 */
module.exports = async function getClassificationNames(req, res) {
    try {
        const adminSecret = req.headers['x-admin-secret'];
        if (adminSecret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'No autorizado.' });

        const { data: etapas, error } = await supabase
            .from('etapas')
            .select('archivo_excel')
            .eq('estado', 'finalizada')
            .order('fecha', { ascending: false });

        if (error) throw error;

        const nicknames = new Set();
        etapas.forEach(etapa => {
            if (etapa.archivo_excel) {
                try {
                    const json = JSON.parse(etapa.archivo_excel);
                    if (json.categorias) {
                        Object.values(json.categorias).forEach(catPlayers => {
                            catPlayers.forEach(p => {
                                if (p.name) nicknames.add(p.name);
                            });
                        });
                    }
                } catch (e) {
                    console.error('Error parseando JSON de etapa:', e);
                }
            }
        });

        // Convertir a array y ordenar
        return res.status(200).json(Array.from(nicknames).sort());
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
