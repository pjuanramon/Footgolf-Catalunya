// ============================================================
// POST /api/inscripciones/webhook
// Webhook de Stripe para confirmar pago de inscripción
// ============================================================
const { supabase } = require('../../lib/supabase');
const { verificarWebhook } = require('../../lib/stripe');
const {
    enviarConfirmacionInscripcionConLicencia,
    enviarConfirmacionInscripcionSinLicencia
} = require('../../lib/email');

// Desactivar body parser para raw body
module.exports.config = {
    api: { bodyParser: false }
};

function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        // 1. Verificar firma
        const rawBody = await getRawBody(req);
        const signature = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_INSCRIPCIONES;

        let event;
        try {
            event = verificarWebhook(rawBody, signature, webhookSecret);
        } catch (err) {
            console.error('Error verificando webhook inscripción:', err.message);
            return res.status(400).json({ error: 'Firma inválida.' });
        }

        // 2. Solo checkout completado
        if (event.type !== 'checkout.session.completed') {
            return res.status(200).json({ received: true });
        }

        const session = event.data.object;
        const meta = session.metadata;

        // 3. Verificar que es una inscripción
        if (meta.tipo !== 'inscripcion') {
            return res.status(200).json({ received: true, skipped: 'not_inscripcion' });
        }

        // 4. Registrar inscripción
        const { error: inscError } = await supabase
            .from('inscripciones')
            .insert({
                jugador_id: meta.jugador_id,
                etapa_id: parseInt(meta.etapa_id),
                stripe_payment_id: session.payment_intent,
                estado: 'pagada'
            });

        if (inscError) {
            // Si ya existe (constraint unique), actualizar estado
            if (inscError.code === '23505') {
                await supabase
                    .from('inscripciones')
                    .update({
                        estado: 'pagada',
                        stripe_payment_id: session.payment_intent,
                        fecha_inscripcion: new Date().toISOString()
                    })
                    .eq('jugador_id', meta.jugador_id)
                    .eq('etapa_id', parseInt(meta.etapa_id));
            } else {
                throw inscError;
            }
        }

        // 5. Obtener datos para email
        const { data: jugador } = await supabase
            .from('jugadores')
            .select('*')
            .eq('id', meta.jugador_id)
            .single();

        const { data: etapa } = await supabase
            .from('etapas')
            .select('*')
            .eq('id', parseInt(meta.etapa_id))
            .single();

        // 6. Enviar email según licencia
        try {
            if (jugador.tiene_licencia) {
                await enviarConfirmacionInscripcionConLicencia(jugador, etapa);
            } else {
                await enviarConfirmacionInscripcionSinLicencia(jugador, etapa);
            }
        } catch (emailErr) {
            console.error('Error enviando email inscripción:', emailErr.message);
        }

        return res.status(200).json({ received: true, inscripcion: 'registrada' });

    } catch (error) {
        console.error('Error en webhook de inscripción:', error);
        return res.status(500).json({ error: 'Error interno.' });
    }
};
