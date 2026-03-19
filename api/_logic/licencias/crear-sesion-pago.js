// ============================================================
// POST /api/licencias/crear-sesion-pago
// Crea una sesión de Stripe Checkout para pagar la licencia
// ============================================================
const { supabase } = require('../../../lib/supabase');
const { stripe } = require('../../../lib/stripe');
const { calcularPrecioLicencia } = require('../../../lib/pricing');

/**
 * Función auxiliar para normalizar texto (comparación robusta)
 * Quita tildes, espacios extra y caracteres raros.
 */
function normalizar(t) {
    if (!t) return '';
    return t.toString().toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quitar tildes
        .replace(/[^a-z0-9]/g, "");      // Quitar TODO lo que no sea letra o número (espacios, comas, etc.)
}

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

        // 1. VALIDACIÓN ESPECIAL: Si dice que ya pagó, verificar NickName en clasificaciones
        if (yaFuePagado) {
            console.log(`Verificando NickName para pago externo: [${nickname}]`);
            
            // Obtenemos TODAS las etapas finalizadas recientes para mayor seguridad
            const { data: etapas } = await supabase
                .from('etapas')
                .select('archivo_excel, nombre')
                .eq('estado', 'finalizada')
                .order('id', { ascending: false });

            if (!etapas || etapas.length === 0) {
                console.log('No hay etapas finalizadas para validar ranking. Se permite el paso por seguridad.');
            } else {
                let encontrado = false;
                const targetNorm = normalizar(nickname);

                console.log(`Buscando 'fingerprint': ${targetNorm}`);

                // Buscamos en todas las etapas finalizadas (por si alguien faltó en la última pero estuvo en la anterior)
                for (const etapa of etapas) {
                    try {
                        const rankingJson = JSON.parse(etapa.archivo_excel);
                        const categorias = rankingJson.categorias || {};
                        
                        for (const cat in categorias) {
                            const jugadores = categorias[cat];
                            if (jugadores.some(p => normalizar(p.name) === targetNorm)) {
                                encontrado = true;
                                console.log(`Encontrado en Etapa: ${etapa.nombre}, Cat: ${cat}`);
                                break;
                            }
                        }
                    } catch (e) {
                         console.error('Error parseando JSON de etapa:', etapa.nombre);
                    }
                    if (encontrado) break;
                }

                if (!encontrado) {
                    return res.status(400).json({ 
                        error: `No hemos encontrado el NickName "${nickname}" en las clasificaciones oficiales de 2026. Para acogerte a esta opción, debes haber puntuado en alguna etapa previa. Si crees que es un error, asegúrate de escribirlo exactamente igual que en la tabla de clasificación.` 
                    });
                }
            }
        }

        // Buscar si el jugador ya existe
        const itemEmail = email.trim().toLowerCase();
        const { data: jugadorExistente } = await supabase
            .from('jugadores')
            .select('*')
            .eq('email', itemEmail)
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
                    email: itemEmail,
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
                email: itemEmail,
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
