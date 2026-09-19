const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Método no permitido' });
    }

    try {
        const body = req.body || {};
        const autor = (body.autor || '').trim();
        const texto = (body.texto || '').trim();
        const partido = (body.partido || '').trim();
        const hoyo = (body.hoyo || '').trim();

        if (!texto) {
            return res.status(400).json({ ok: false, error: 'El mensaje no puede estar vacío.' });
        }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data, error } = await supabase.from('etapas').select('archivo_excel').eq('id', 203).single();
        if (error) throw error;

        let payload = { reportes: [] };
        if (data && data.archivo_excel) {
            try {
                payload = JSON.parse(data.archivo_excel);
                if (!Array.isArray(payload.reportes)) payload.reportes = [];
            } catch (e) {
                payload = { reportes: [] };
            }
        }

        const nuevoReporte = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            autor: autor || 'Jugador en campo',
            partido: partido || 'General',
            hoyo: hoyo || '',
            texto,
            fecha: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }),
            timestamp: Date.now()
        };

        payload.reportes.unshift(nuevoReporte);
        if (payload.reportes.length > 100) {
            payload.reportes = payload.reportes.slice(0, 100);
        }

        const { error: updateError } = await supabase
            .from('etapas')
            .update({ archivo_excel: JSON.stringify(payload) })
            .eq('id', 203);

        if (updateError) throw updateError;

        return res.status(200).json({ ok: true, nuevoReporte });
    } catch (err) {
        console.error('Error al enviar reporte:', err);
        return res.status(500).json({ ok: false, error: err.message });
    }
};
