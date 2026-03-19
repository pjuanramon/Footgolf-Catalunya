// ============================================================
// POST /api/inscripciones/crear-sesion-pago
// Crea una sesión de Stripe Checkout para inscribirse a una etapa
// ============================================================
const { supabase } = require('../../../lib/supabase');
const { stripe } = require('../../../lib/stripe');
const { PRECIO_INSCRIPCION } = require('../../../lib/pricing');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { nickname, email, etapa_id } = req.body;

        // Validaciones
        if (!nickname || !nickname.trim()) {
            return res.status(400).json({ error: 'El nickname es obligatorio.' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'El email es obligatorio.' });
        }
        if (!etapa_id) {
            return res.status(400).json({ error: 'La etapa es obligatoria.' });
        }

        // Verificar que la etapa existe y está abierta
        // 4. Calcular precio
        const { data: etapa } = await supabase.from('etapas').select('*').eq('id', etapa_id).single();
        if (!etapa) return res.status(404).json({ error: 'Etapa no encontrada.' });

        if (etapa.estado !== 'abierta') {
            return res.status(400).json({ error: 'La etapa no está abierta para inscripciones.' });
        }

        // Buscar o crear jugador
        let jugador;
        const emailNorm = email.trim().toLowerCase();

        const { data: jugadorExistente } = await supabase
            .from('jugadores')
            .select('*')
            .eq('email', emailNorm)
            .single();

        if (jugadorExistente) {
            jugador = jugadorExistente;
        } else {
            // Crear jugador sin licencia
            const { data: newPlayer, error: insertError } = await supabase
                .from('jugadores')
                .insert({
                    nickname: nickname.trim(),
                    email: emailNorm,
                    tiene_licencia: false
                })
                .select('*')
                .single();

            if (insertError) {
                // Puede fallar si el nickname ya existe
                if (insertError.code === '23505') {
                    return res.status(400).json({ error: 'Este nickname ya está registrado con otro email.' });
                }
                throw insertError;
            }
            jugador = newPlayer;
        }

        // Verificar que no esté ya inscrito
        const { data: inscripcionExistente } = await supabase
            .from('inscripciones')
            .select('id')
            .eq('jugador_id', jugador.id)
            .eq('etapa_id', etapa_id)
            .eq('estado', 'pagada')
            .single();

        if (inscripcionExistente) {
            return res.status(400).json({ error: 'Ya estás inscrito en esta etapa.' });
        }

        // Preparar respuesta con advertencia si no tiene licencia
        const advertencia = !jugador.tiene_licencia
            ? 'Puedes jugar sin licencia, pero no puntuarás en la Liga Catalana.'
            : null;

        // Crear sesión de Stripe Checkout
        const { equipo_nombre } = req.body;
        const esEquipo = etapa.tipo === 'equipos';
        const precio = esEquipo ? (etapa.precio_equipo || 110) : (etapa.precio_inscripcion || PRECIO_INSCRIPCION);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `Inscripción ${etapa.nombre}${esEquipo ? ` - Equipo: ${equipo_nombre}` : ''}`,
                        description: `Inscripción para ${jugador.nickname}${esEquipo ? ` (Equipo: ${equipo_nombre})` : ''} — ${etapa.nombre}`
                    },
                    unit_amount: Math.round(precio * 100)
                },
                quantity: 1
            }],
            metadata: {
                tipo: 'inscripcion',
                jugador_id: jugador.id,
                etapa_id: String(etapa_id),
                nickname: jugador.nickname,
                email: jugador.email,
                tiene_licencia: String(jugador.tiene_licencia),
                equipo_nombre: equipo_nombre || ''
            },
            success_url: `${process.env.APP_URL}/src/pages/inscripciones.html?resultado=exito&etapa=${etapa_id}`,
            cancel_url: `${process.env.APP_URL}/src/pages/inscripciones.html?resultado=cancelado`
        });

        return res.status(200).json({
            url: session.url,
            precio: precio,
            sessionId: session.id,
            tieneLicencia: jugador.tiene_licencia,
            advertencia: advertencia
        });

    } catch (error) {
        console.error('Error creando sesión de inscripción:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
