// ============================================================
// GET /api/debug/env-check
// Chequeo simple de presencia de variables
// ============================================================
module.exports = async function handler(req, res) {
    const check = (key) => ({
        key: key,
        presente: !!process.env[key],
        valor_parcial: process.env[key] ? process.env[key].substring(0, 4) + '...' : 'FALTA'
    });

    return res.status(200).json({
        mensaje: "Chequeo de variables de entorno",
        variables: [
            check('SUPABASE_URL'),
            check('SUPABASE_SERVICE_ROLE_KEY'),
            check('STRIPE_SECRET_KEY'),
            check('ADMIN_SECRET'),
            check('APP_URL')
        ],
        timestamp: new Date().toISOString()
    });
};
