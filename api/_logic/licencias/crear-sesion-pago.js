// ============================================================
// POST /api/licencias/crear-sesion-pago
// Crea una sesión de Stripe Checkout para pagar la licencia
// ============================================================
const { supabase } = require('../../../lib/supabase');
const { stripe } = require('../../../lib/stripe');
const { calcularPrecioLicencia, obtenerJornadasJugadas } = require('../../../lib/pricing');

module.exports = async function handler(req, res) {
    // Solo POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        console.log('--- Nueva solicitud de pago de licencia ---');
        console.log('Body:', req.body);

        if (!supabase) return res.status(500).json({ error: 'Error de configuración: Supabase no inicializado.' });
        if (!stripe) return res.status(500).json({ error: 'Error de configuración: Stripe no inicializado.' });

        const { 
            nickname, email, nombre_completo, fecha_nacimiento, genero, 
            telefono, club, es_renovacion, etapa_inicio 
        } = req.body;

        const anioActual = new Date().getFullYear();
        const esAntiguo = es_renovacion === 'si';
        const etapaInic = parseInt(etapa_inicio) || 1;

        // Validaciones
        if (!nickname || !nickname.trim()) {
            return res.status(400).json({ error: 'El nickname es obligatorio.' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'El email es obligatorio.' });
        }
        if (!es_renovacion) {
            return res.status(400).json({ error: 'Debe indicar si es una renovación o primera licencia.' });
        }

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

        // Calcular precio usando la nueva lógica
        const precio = calcularPrecioLicencia(jugadorExistente, esAntiguo, etapaInic);

        // Crear sesión de Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `Licencia Liga Catalana FootGolf ${anioActual}`,
                        description: `Licencia para ${nickname} (${esAntiguo ? 'Renovación' : 'Nueva desde Etapa ' + etapaInic})`
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
                anio_primera_licencia: String(esAntiguo ? (jugadorExistente?.anio_primera_licencia || 2025) : anioActual),
                anio: String(anioActual),
                etapa_inicio: String(etapaInic),
                es_renovacion: String(esAntiguo)
            },
            success_url: `${process.env.APP_URL}/src/pages/licencias.html?resultado=exito`,
            cancel_url: `${process.env.APP_URL}/src/pages/licencias.html?resultado=cancelado`
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
