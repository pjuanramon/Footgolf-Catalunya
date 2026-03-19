// ============================================================
// Unified API Router - Footgolf Catalunya
// Consolidación para evitar límites de Vercel Hobby (12 funciones)
// ============================================================
const { parse } = require('url');

// Configuración de Vercel: deshabilitar bodyParser para manejar Raw Body (Webhooks)
module.exports.config = {
    api: { bodyParser: false }
};

async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

module.exports = async function handler(req, res) {
    try {
        // 1. Parsear URL y Query Params
        const parsedUrl = parse(req.url, true);
        const { pathname, query } = parsedUrl;
        const path = pathname.replace('/api/', '');
        
        // Adjuntar query a la request para compatibilidad con sub-handlers
        req.query = query;

        // 2. Obtener Raw Body
        const rawBody = await getRawBody(req);
        req.rawBody = rawBody;

        // 3. Intentar parsear JSON Body si no es un webhook
        if (rawBody.length > 0) {
            try {
                // Solo si el content-type dice ser JSON
                if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                    req.body = JSON.parse(rawBody.toString());
                }
            } catch (e) {
                console.warn('Fallo al parsear JSON body:', e.message);
                // No detenemos el proceso, algunos handlers podrían no necesitarlo o manejarlo distinto
            }
        }

        // --- ENRUTADOR DINÁMICO ---
        
        switch (path) {
            case 'etapas/listado':
                return require('./_logic/etapas/listado')(req, res);
            
            case 'licencias/crear-sesion-pago':
                return require('./_logic/licencias/crear-sesion-pago')(req, res);
            
            case 'licencias/webhook':
                return require('./_logic/licencias/webhook')(req, res);
            
            case 'inscripciones/crear-sesion-pago':
                return require('./_logic/inscripciones/crear-sesion-pago')(req, res);
            
            case 'inscripciones/webhook':
                return require('./_logic/inscripciones/webhook')(req, res);
            
            case 'clasificacion/procesar-etapa':
                return require('./_logic/clasificacion/procesar-etapa')(req, res);
            
            case 'cron/automation':
                return require('./_logic/cron/automation')(req, res);
            
            case 'debug/status':
                return require('./_logic/debug/status')(req, res);
            
            case 'debug/env-check':
                return require('./_logic/debug/env-check')(req, res);

            default:
                return res.status(404).json({ 
                    error: `Ruta ${path} no encontrada en la API unificada.`,
                    path_debug: path
                });
        }

    } catch (e) {
        console.error('API Router Error:', e);
        return res.status(500).json({ 
            error: 'Error interno en el Router de la API.',
            message: e.message 
        });
    }
};
