// ============================================================
// GET /api/debug/status
// Diagnóstico de configuración
// ============================================================
module.exports = async function handler(req, res) {
    // Solo accesible con secret
    const secret = req.query.secret;
    if (secret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ error: 'No autorizado.' });
    }

    const obfuscate = (val) => val ? val.substring(0, 6) + '...' + val.substring(val.length - 4) : 'MISSING';

    return res.status(200).json({
        status: 'UP',
        env: {
            SUPABASE_URL: obfuscate(process.env.SUPABASE_URL),
            SUPABASE_ANON: obfuscate(process.env.SUPABASE_ANON_KEY),
            SUPABASE_SERVICE: obfuscate(process.env.SUPABASE_SERVICE_ROLE_KEY),
            STRIPE_KEY: obfuscate(process.env.STRIPE_SECRET_KEY),
            RESEND_KEY: obfuscate(process.env.RESEND_API_KEY),
            APP_URL: process.env.APP_URL || 'MISSING'
        },
        nodeVersion: process.version
    });
};
