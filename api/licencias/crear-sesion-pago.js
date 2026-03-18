// ============================================================
// POST /api/licencias/crear-sesion-pago
// Crea una sesión de Stripe Checkout para pagar la licencia
// ============================================================
const { supabase } = require('../../lib/supabase');
const { stripe } = require('../../lib/stripe');
const { calcularPrecioLicencia, obtenerJornadasJugadas } = require('../../lib/pricing');

module.exports = async function handler(req, res) {
    // Solo POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { nickname, email, nombre_completo, fecha_nacimiento, genero, telefono, club, anio_primera_licencia } = req.body;

        // Validaciones
        if (!nickname || !nickname.trim()) {
            return res.status(400).json({ error: 'El nickname es obligatorio.' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'El email es obligatorio.' });
        }
        if (!anio_primera_licencia) {
            return res.status(400).json({ error: 'El año de primera licencia es obligatorio.' });
        }

        const anioActual = new Date().getFullYear();

        // Buscar si el jugador ya existe
        const { data: jugadorExistente } = await supabase
            .from('jugadores')
            .select('*')
            .eq('email', email.trim().toLowerCase())
            .single();

        // Verificar si ya tiene licencia pagada del año actual
        if (jugadorExistente) {
            const { data: licenciaExistente } = await supabase
                .from('licencias')
                .select('id')
                .eq('jugador_id', jugadorExistente.id)
                .eq('anio', anioActual)
                .eq('estado', 'pagada')
                .single();

            if (licenciaExistente) {
                return res.status(400).json({ error: 'Ya tienes licencia pagada para esta temporada.' });
            }
        }

        // Calcular precio
        const jornadasJugadas = await obtenerJornadasJugadas(supabase);
        const precio = calcularPrecioLicencia(jugadorExistente, jornadasJugadas);

        // Crear sesión de Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `Licencia Liga Catalana FootGolf ${anioActual}`,
                        description: `Licencia para ${nickname}`
                    },
                    unit_amount: Math.round(precio * 100) // Stripe usa céntimos
                },
                quantity: 1
            }],
            metadata: {
                tipo: 'licencia',
                nickname: nickname.trim(),
                email: email.trim().toLowerCase(),
                nombre_completo: nombre_completo || '',
                fecha_nacimiento: fecha_nacimiento || '',
                genero: genero || '',
                telefono: telefono || '',
                club: club || '',
                anio_primera_licencia: String(anio_primera_licencia),
                anio: String(anioActual)
            },
            success_url: `${process.env.APP_URL}/licencias?resultado=exito`,
            cancel_url: `${process.env.APP_URL}/licencias?resultado=cancelado`
        });

        return res.status(200).json({
            url: session.url,
            precio: precio,
            sessionId: session.id
        });

    } catch (error) {
        console.error('Error creando sesión de pago de licencia:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
