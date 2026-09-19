const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data, error } = await supabase.from('etapas').select('archivo_excel').eq('id', 203).single();
        if (error) throw error;

        let reportes = [];
        if (data && data.archivo_excel) {
            try {
                const parsed = JSON.parse(data.archivo_excel);
                reportes = Array.isArray(parsed.reportes) ? parsed.reportes : [];
            } catch (e) {
                reportes = [];
            }
        }
        return res.status(200).json({ ok: true, reportes });
    } catch (err) {
        console.error('Error al obtener reportes en directo:', err);
        return res.status(500).json({ ok: false, error: err.message });
    }
};
