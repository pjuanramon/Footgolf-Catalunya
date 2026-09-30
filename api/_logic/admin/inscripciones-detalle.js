const { supabase } = require('../../../lib/supabase');
const { stripe } = require('../../../lib/stripe');

/**
 * GET /api/admin/inscripciones-detalle?etapa_id=...
 */
module.exports = async function getInscripcionesDetalle(req, res) {
    try {
        const { etapa_id } = req.query;
        if (!etapa_id) return res.status(400).json({ error: 'Falta etapa_id' });

        const { data: inscripciones, error } = await supabase
            .from('inscripciones')
            .select('*, jugadores(nickname, nombre_completo, tiene_licencia, email)')
            .eq('etapa_id', etapa_id)
            .order('fecha_inscripcion', { ascending: true });

        if (error) throw error;

        const resultados = [];
        for (const ins of inscripciones) {
            let pago = {
                monto: null,
                moneda: 'eur',
                descripcion: null,
                incluye_balon: false,
                metodo: null,
                line_items: []
            };

            if (ins.stripe_payment_id && stripe) {
                try {
                    // 1. Obtener PaymentIntent
                    const pi = await stripe.paymentIntents.retrieve(ins.stripe_payment_id);
                    pago.monto = pi.amount ? (pi.amount / 100) : null;
                    pago.moneda = pi.currency;
                    pago.descripcion = pi.description;
                    pago.pi_metadata = pi.metadata;

                    // 2. Buscar Checkout Session asociada para obtener metadata y line_items
                    const sessions = await stripe.checkout.sessions.list({
                        payment_intent: ins.stripe_payment_id,
                        limit: 1,
                        expand: ['data.line_items']
                    });

                    if (sessions.data && sessions.data.length > 0) {
                        const sess = sessions.data[0];
                        pago.session_metadata = sess.metadata;
                        pago.session_amount_total = sess.amount_total ? (sess.amount_total / 100) : null;
                        
                        if (sess.line_items && sess.line_items.data) {
                            pago.line_items = sess.line_items.data.map(li => ({
                                description: li.description,
                                amount_total: li.amount_total / 100
                            }));
                        }

                        if (sess.metadata && (sess.metadata.incluye_balon === 'true' || sess.metadata.incluye_balon === true)) {
                            pago.incluye_balon = true;
                        }
                    }

                    // Determinar si incluye balón por precio si no está en metadata
                    if (!pago.incluye_balon) {
                        if (pago.monto === 60 || pago.monto === 22 || pago.session_amount_total === 60 || pago.session_amount_total === 22) {
                            pago.incluye_balon = true;
                        }
                    }

                } catch (stErr) {
                    pago.error = stErr.message;
                }
            }

            resultados.push({
                id: ins.id,
                fecha_inscripcion: ins.fecha_inscripcion,
                jugador: ins.jugadores?.nombre_completo || ins.jugadores?.nickname || ins.nombre_manual,
                nickname: ins.jugadores?.nickname,
                email: ins.jugadores?.email,
                stripe_payment_id: ins.stripe_payment_id,
                pago
            });
        }

        return res.status(200).json({
            etapa_id,
            total: resultados.length,
            resultados
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
