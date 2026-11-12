// ============================================================
// GET /api/etapas/listado
// Lista las etapas (opcionalmente filtradas por estado)
// Incluye auto-cierre instantáneo al cumplirse la hora de cierre (miércoles 23:59h)
// ============================================================
const { supabase } = require('../../../lib/supabase');
const { calcularFechaCierre } = require('../../../lib/stage-automation');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { estado } = req.query;

        let query = supabase
            .from('etapas')
            .select('*')
            .order('fecha', { ascending: true });

        const states = estado ? estado.split(',').map(s => s.trim()) : null;

        if (states) {
            if (states.length > 1) {
                query = query.in('estado', states);
            } else {
                query = query.eq('estado', states[0]);
            }
        }

        const { data, error } = await query;
        if (error) throw error;

        const ahora = new Date();
        const etapas = data || [];
        const idsParaCerrar = [];

        for (const etapa of etapas) {
            if (etapa.estado === 'abierta') {
                const fechaCierre = calcularFechaCierre(etapa);
                if (ahora >= fechaCierre) {
                    etapa.estado = 'cerrada';
                    idsParaCerrar.push(etapa.id);
                }
            }
        }

        if (idsParaCerrar.length > 0) {
            await supabase
                .from('etapas')
                .update({ estado: 'cerrada' })
                .in('id', idsParaCerrar);
        }

        const resultado = states
            ? etapas.filter(e => states.includes(e.estado))
            : etapas;

        return res.status(200).json(resultado);

    } catch (error) {
        console.error('Error listando etapas:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
