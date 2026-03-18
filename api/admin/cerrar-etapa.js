// ============================================================
// POST /api/admin/cerrar-etapa
// Cierra una etapa (no se permiten más inscripciones)
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
        const { etapa_id } = req.body;

        if (!etapa_id) {
            return res.status(400).json({ error: 'etapa_id es obligatorio.' });
        }

        // Verificar que la etapa existe y está abierta
        const { data: etapa, error: etapaError } = await supabase
            .from('etapas')
            .select('*')
            .eq('id', etapa_id)
            .single();

        if (etapaError || !etapa) {
            return res.status(404).json({ error: 'Etapa no encontrada.' });
        }

        if (etapa.estado === 'cerrada') {
            return res.status(400).json({ error: 'La etapa ya está cerrada.' });
        }

        if (etapa.estado === 'finalizada') {
            return res.status(400).json({ error: 'La etapa ya está finalizada y no puede cerrarse.' });
        }

        // Cerrar la etapa
        const { error: updateError } = await supabase
            .from('etapas')
            .update({ estado: 'cerrada' })
            .eq('id', etapa_id);

        if (updateError) throw updateError;

        // Contar inscripciones pagadas
        const { data: inscripciones } = await supabase
            .from('inscripciones')
            .select('id')
            .eq('etapa_id', etapa_id)
            .eq('estado', 'pagada');

        return res.status(200).json({
            ok: true,
            etapa: {
                id: etapa.id,
                nombre: etapa.nombre,
                estado: 'cerrada'
            },
            totalInscritos: inscripciones ? inscripciones.length : 0
        });

    } catch (error) {
        console.error('Error cerrando etapa:', error);
        return res.status(500).json({ error: 'Error interno.' });
    }
};
