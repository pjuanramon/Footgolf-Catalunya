// ============================================================
// POST /api/licencias/crear-sesion-pago
// Crea una sesión de Stripe Checkout para pagar la licencia
// ============================================================
const { supabase } = require('../../../lib/supabase');
const { stripe } = require('../../../lib/stripe');
const { calcularPrecioLicencia } = require('../../../lib/pricing');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        console.log('--- Nueva solicitud de pago de licencia ---');
        const { 
            nickname, email, nombre_completo, fecha_nacimiento, genero, 
            telefono, club, es_renovacion, etapa_inicio, ya_pagado 
        } = req.body;

        if (!supabase || !stripe) return res.status(500).json({ error: 'Falta configuración en el servidor.' });

        const anioActual = new Date().getFullYear();
        const esAntiguo = es_renovacion === 'si';
        const etapaInic = parseInt(etapa_inicio) || 1;
        const yaFuePagado = ya_pagado === 'si';

        // Validaciones básicas
        if (!nickname || !nickname.trim() || !email || !email.trim()) {
            return res.status(400).json({ error: 'Nickname y Email son obligatorios.' });
        }

        // Buscar si el jugador ya existe
        const { data: jugadorExistente } = await supabase
            .from('jugadores')
            .select('*')
            .eq('email', email.trim().toLowerCase())
            .single();

        // Verificar si ya tiene licencia pagada (si no marcó ya_pagado)
        if (jugadorExistente && !yaFuePagado) {
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
        const precio = calcularPrecioLicencia(jugadorExistente, esAntiguo, etapaInic, yaFuePagado);

        // CASO 0€: Registro directo
        if (precio === 0) {
            console.log('Precio 0€: Registro directo');
            let jugadorId;
            if (jugadorExistente) {
                jugadorId = jugadorExistente.id;
                await supabase.from('jugadores').update({
                    nombre_completo: nombre_completo || jugadorExistente.nombre_completo,
                    telefono: telefono || jugadorExistente.telefono,
                    club: club || jugadorExistente.club,
                    anio_licencia: anioActual,
                    tiene_licencia: true
                }).eq('id', jugadorId);
            } else {
                const { data: newPlayer, error: pErr } = await supabase.from('jugadores').insert({
                    nickname: nickname.trim(),
                    email: email.trim().toLowerCase(),
                    nombre_completo: nombre_completo || null,
                    telefono: telefono || null,
                    club: club || 'Independiente',
                    anio_licencia: anioActual,
                    tiene_licencia: true
                }).select('id').single();
                if (pErr) throw pErr;
                jugadorId = newPlayer.id;
            }

            await supabase.from('licencias').insert({
                jugador_id: jugadorId,
                anio: anioActual,
                estado: 'pagada',
                stripe_payment_id: 'PRE-PAID-EXTERNAL'
            });

            return res.status(200).json({
                url: `${process.env.APP_URL}/src/pages/licencias.html?resultado=exito`,
                precio: 0
            });
        }

        // CASO PAGO: Stripe Checkout
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
                    unit_amount: Math.round(precio * 100)
                },
                quantity: 1
            }],
            metadata: {
                tipo: 'licencia',
                nickname: nickname.trim(),
                email: email.trim().toLowerCase(),
                nombre_completo: nombre_completo || '',
                telefono: telefono || '',
                club: club || '',
                anio_primera_licencia: String(esAntiguo ? (jugadorExistente?.anio_licencia || 2025) : anioActual),
                anio: String(anioActual),
                etapa_inicio: String(etapaInic),
                es_renovacion: String(esAntiguo)
            },
            success_url: `${process.env.APP_URL}/src/pages/licencias.html?resultado=exito`,
            cancel_url: `${process.env.APP_URL}/src/pages/licencias.html?resultado=cancelado`
        });

        return res.status(200).json({ url: session.url, precio });

    } catch (error) {
        console.error('Error en licencias API:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
