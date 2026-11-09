// ============================================================
// POST /api/licencias/webhook
// Webhook de Stripe para confirmar pago de licencia
// ============================================================
const { supabase } = require('../../../lib/supabase');
const { verificarWebhook } = require('../../../lib/stripe');
const { enviarConfirmacionLicencia } = require('../../../lib/email');

// Desactivar el body parser de Vercel para recibir el raw body
module.exports.config = {
    api: { bodyParser: false }
};

/**
 * Lee el body crudo de la request (necesario para verificar firma de Stripe).
 */
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
        // 1. Verificar firma del webhook (usamos el rawBody que nos pasa el router)
        const rawBody = req.rawBody;
        const signature = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LICENCIAS;

        let event;
        try {
            event = verificarWebhook(rawBody, signature, webhookSecret);
        } catch (err) {
            console.error('Error verificando webhook:', err.message);
            return res.status(400).json({ error: 'Firma inválida.' });
        }

        // 2. Solo procesar checkout completado
        if (event.type !== 'checkout.session.completed') {
            return res.status(200).json({ received: true });
        }

        const session = event.data.object;
        const meta = session.metadata;

        // 3. Verificar que es una licencia
        if (!meta || meta.tipo !== 'licencia') {
            return res.status(200).json({ received: true, skipped: 'not_licencia' });
        }

        const anioActual = parseInt(meta.anio) || 2027;
        const emailNorm = (meta.email || '').trim().toLowerCase();
        const nickClean = (meta.nickname || '').trim();
        const nickNormEspacios = nickClean
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

        // 4. Crear o actualizar jugador (evitando colisión UNIQUE de nickname)
        let jugadorId;
        let { data: jugadorExistente } = await supabase
            .from('jugadores')
            .select('id, email, anio_licencia, tiene_licencia')
            .eq('email', emailNorm)
            .maybeSingle();

        if (!jugadorExistente && nickNormEspacios) {
            const { data: porNick } = await supabase
                .from('jugadores')
                .select('id, email, anio_licencia, tiene_licencia')
                .eq('nickname_normalizado', nickNormEspacios)
                .maybeSingle();
            if (porNick) {
                jugadorExistente = porNick;
            }
        }

        const anioPrimeraMeta = parseInt(meta.anio_primera_licencia) || anioActual;
        const anioPrimeraEfectivo = (jugadorExistente && jugadorExistente.anio_licencia)
            ? Math.min(jugadorExistente.anio_licencia, anioPrimeraMeta)
            : anioPrimeraMeta;

        const currentYear = new Date().getFullYear();

        if (jugadorExistente) {
            // Actualizar jugador existente
            jugadorId = jugadorExistente.id;
            const updateData = {};
            const oldEmail = (jugadorExistente.email || '').toLowerCase();
            if (!oldEmail.includes('@') || oldEmail.endsWith('@example.com')) {
                updateData.email = emailNorm;
            }
            if (meta.nombre_completo) updateData.nombre_completo = meta.nombre_completo;
            if (meta.fecha_nacimiento) updateData.fecha_nacimiento = meta.fecha_nacimiento;
            if (meta.genero) updateData.genero = meta.genero;
            if (meta.telefono) updateData.telefono = meta.telefono;
            if (meta.club) updateData.club = meta.club;
            updateData.anio_licencia = anioPrimeraEfectivo;
            if (anioActual <= currentYear) updateData.tiene_licencia = true;

            await supabase
                .from('jugadores')
                .update(updateData)
                .eq('id', jugadorId);
        } else {
            // Crear nuevo jugador
            const { data: newPlayer, error: insertError } = await supabase
                .from('jugadores')
                .insert({
                    nickname: nickClean,
                    email: emailNorm,
                    nombre_completo: meta.nombre_completo || null,
                    fecha_nacimiento: meta.fecha_nacimiento || null,
                    genero: meta.genero || null,
                    telefono: meta.telefono || null,
                    club: meta.club || null,
                    anio_licencia: anioPrimeraEfectivo,
                    tiene_licencia: anioActual <= currentYear
                })
                .select('id')
                .single();

            if (insertError) throw insertError;
            jugadorId = newPlayer.id;
        }

        // 5. Registrar licencia de forma idempotente (evitar duplicados si Stripe reintenta el webhook)
        const { data: yaExisteLic } = await supabase
            .from('licencias')
            .select('id')
            .eq('jugador_id', jugadorId)
            .eq('anio', anioActual)
            .eq('estado', 'pagada')
            .maybeSingle();

        if (!yaExisteLic) {
            const { error: licError } = await supabase
                .from('licencias')
                .insert({
                    jugador_id: jugadorId,
                    anio: anioActual,
                    stripe_payment_id: session.payment_intent,
                    estado: 'pagada'
                });

            if (licError) throw licError;
        }

        // Asegurar que el trigger de BD no sobrescriba anio_licencia de jugadores veteranos
        await supabase
            .from('jugadores')
            .update({ anio_licencia: anioPrimeraEfectivo })
            .eq('id', jugadorId);

        // 6. Obtener datos completos del jugador para el email
        const { data: jugador } = await supabase
            .from('jugadores')
            .select('*')
            .eq('id', jugadorId)
            .single();

        // 7. Enviar email de confirmación
        try {
            await enviarConfirmacionLicencia(jugador, anioActual);
        } catch (emailErr) {
            console.error('Error enviando email de confirmación:', emailErr.message);
            // No fallar el webhook por error de email
        }

        return res.status(200).json({ received: true, jugadorId });

    } catch (error) {
        console.error('Error en webhook de licencia:', error);
        return res.status(500).json({ error: 'Error interno.' });
    }
};
