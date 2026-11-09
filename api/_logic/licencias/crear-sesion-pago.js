// ============================================================
// POST /api/licencias/crear-sesion-pago
// Crea una sesión de Stripe Checkout para pagar la licencia
// ============================================================
const { supabase } = require('../../../lib/supabase');
const paymentGateway = require('../../../lib/payment-gateway');
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
            telefono, club, es_renovacion, etapa_inicio, ya_pagado, anio_primera_licencia 
        } = req.body;

        if (!supabase) return res.status(500).json({ error: 'Falta configuración en el servidor.' });

        const anioActual = parseInt(req.body.anio) || 2027;
        const esAntiguo = es_renovacion === 'si';
        const etapaInic = parseInt(etapa_inicio) || 1;
        const yaFuePagado = ya_pagado === 'si';

        // Validaciones básicas
        if (!nickname || !nickname.trim() || !email || !email.trim()) {
            return res.status(400).json({ error: 'Nickname y Email son obligatorios.' });
        }
        if (!nombre_completo || !nombre_completo.trim() || !fecha_nacimiento || !genero || !telefono) {
            return res.status(400).json({ error: 'Todos los campos (Nombre completo, Fecha Nacimiento, Género y Teléfono) son obligatorios para poder categorizarte correctamente.' });
        }

        // 1. VALIDACIÓN ESPECIAL: Si dice que ya pagó, verificar NickName en clasificaciones
        if (yaFuePagado) {
            console.log(`Verificando NickName para pago externo: [${nickname}]`);
            const { data: etapas } = await supabase
                .from('etapas')
                .select('archivo_excel, nombre')
                .eq('estado', 'finalizada')
                .order('id', { ascending: false });

            if (!etapas || etapas.length === 0) {
                console.log('No hay etapas finalizadas para validar ranking.');
            } else {
                let encontrado = false;
                const targetNorm = normalizar(nickname);
                for (const etapa of etapas) {
                    try {
                        const rankingJson = JSON.parse(etapa.archivo_excel);
                        const categorias = rankingJson.categorias || {};
                        for (const cat in categorias) {
                            if (categorias[cat].some(p => normalizar(p.name) === targetNorm)) {
                                encontrado = true;
                                break;
                            }
                        }
                    } catch (e) {}
                    if (encontrado) break;
                }
                if (!encontrado) {
                    return res.status(400).json({ 
                        error: `No hemos encontrado el NickName "${nickname}" en las clasificaciones oficiales de 2026. Para acogerte a esta opción, debes haber puntuado en alguna etapa previa.` 
                    });
                }
            }
        }

        // Buscar si el jugador ya existe (por email o fallback por nickname si tenía email placeholder/distinto)
        const itemEmail = email.trim().toLowerCase();
        const nickClean = nickname.trim();
        const nickNormEspacios = nickClean
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

        let { data: jugadorExistente } = await supabase
            .from('jugadores')
            .select('*')
            .eq('email', itemEmail)
            .maybeSingle();

        let jugadorPorNick = null;
        if (!jugadorExistente && nickNormEspacios) {
            const { data: candidatoNick } = await supabase
                .from('jugadores')
                .select('*')
                .eq('nickname_normalizado', nickNormEspacios)
                .maybeSingle();

            if (candidatoNick) {
                jugadorPorNick = candidatoNick;
                // Si la ficha previa tenía un email placeholder (@example.com o sin @), reutilizamos esa ficha
                const oldEmail = (candidatoNick.email || '').toLowerCase();
                if (!oldEmail.includes('@') || oldEmail.endsWith('@example.com')) {
                    jugadorExistente = candidatoNick;
                }
            }
        }

        let jugadorId = jugadorExistente ? jugadorExistente.id : null;

        // Verificar si ya tiene licencia pagada para la temporada solicitada (si no marcó ya_pagado)
        const jugadorAComprobar = jugadorExistente || jugadorPorNick;
        if (jugadorAComprobar && !yaFuePagado) {
            const { data: licenciaExistente } = await supabase
                .from('licencias')
                .select('id, fecha_compra, anio')
                .eq('jugador_id', jugadorAComprobar.id)
                .eq('anio', anioActual)
                .eq('estado', 'pagada')
                .maybeSingle();

            if (licenciaExistente) {
                const fechaStr = licenciaExistente.fecha_compra
                    ? ` (registrada el ${new Date(licenciaExistente.fecha_compra).toLocaleDateString('es-ES')})`
                    : '';
                const nombreMostrar = jugadorAComprobar.nombre_completo || jugadorAComprobar.nickname;
                return res.status(409).json({
                    alreadyPaid: true,
                    anio: anioActual,
                    jugador: nombreMostrar,
                    fecha_compra: licenciaExistente.fecha_compra,
                    error: `¡Buenas noticias, ${nombreMostrar}! Ya tienes tu Licencia Oficial ${anioActual} pagada y activa${fechaStr}. No necesitas volver a abonarla.`
                });
            }
        }

        // Calcular precio
        const precio = calcularPrecioLicencia(jugadorExistente, esAntiguo, etapaInic, yaFuePagado, anioActual);

        // Determinar año de primera licencia preservando antigüedad real si ya existía en BD
        const anioPrimeraInput = esAntiguo ? (parseInt(anio_primera_licencia) || 2025) : anioActual;
        const anioPrimeraEfectivo = (jugadorExistente && jugadorExistente.anio_licencia)
            ? Math.min(jugadorExistente.anio_licencia, anioPrimeraInput)
            : anioPrimeraInput;

        // CASO 0€: Registro directo
        if (precio === 0) {
            console.log('Precio 0€: Registro directo');
            const currentYear = new Date().getFullYear();
            const userData = {
                email: itemEmail,
                nombre_completo: nombre_completo.trim(),
                fecha_nacimiento: fecha_nacimiento,
                genero: genero,
                telefono: telefono.trim(),
                club: club || 'Independiente',
                anio_licencia: anioPrimeraEfectivo
            };
            if (anioActual <= currentYear || (jugadorExistente && jugadorExistente.tiene_licencia)) {
                userData.tiene_licencia = true;
            }

            if (jugadorExistente) {
                await supabase.from('jugadores').update(userData).eq('id', jugadorId);
            } else {
                const { data: newPlayer, error: pErr } = await supabase.from('jugadores').insert({
                    nickname: nickClean,
                    ...userData
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

            // Preservar anio_licencia histórico frente al trigger de BD
            await supabase.from('jugadores').update({ anio_licencia: anioPrimeraEfectivo }).eq('id', jugadorId);

            return res.status(200).json({
                url: `${process.env.APP_URL}/src/pages/licencias.html?resultado=exito&anio=${anioActual}`,
                precio: 0
            });
        }

        // CASO PAGO: Stripe / Redsys unificado
        const orderId = `lic-${jugadorId || 'new'}-${Date.now()}`;
        const paymentSession = await paymentGateway.crearSesionPago({
            orderId,
            amount: precio,
            concept: `Licencia Liga Catalana FootGolf ${anioActual}`,
            description: `Licencia ${anioActual} para ${nickClean}`,
            metadata: {
                tipo: 'licencia',
                nickname: nickClean,
                email: itemEmail,
                nombre_completo: nombre_completo.trim(),
                fecha_nacimiento: fecha_nacimiento,
                genero: genero,
                telefono: telefono.trim(),
                club: club || '',
                anio_primera_licencia: String(anioPrimeraEfectivo),
                anio: String(anioActual),
                etapa_inicio: String(etapaInic),
                es_renovacion: String(esAntiguo)
            },
            successUrl: `${process.env.APP_URL}/src/pages/licencias.html?resultado=exito&anio=${anioActual}`,
            cancelUrl: `${process.env.APP_URL}/src/pages/licencias.html?resultado=cancelado&anio=${anioActual}`
        });

        return res.status(200).json({ url: paymentSession.url, precio });

    } catch (error) {
        console.error('Error en licencias API:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
