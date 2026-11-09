// ============================================================
// POST /api/redsys/notificacion
// Recibe las notificaciones POST online en tiempo real de Redsys
// ============================================================
const { supabase } = require('../../../lib/supabase');
const { verificarNotificacionRedsys } = require('../../../lib/payment-gateway');
const {
    enviarConfirmacionInscripcionConLicencia,
    enviarConfirmacionInscripcionSinLicencia,
    enviarConfirmacionLicencia
} = require('../../../lib/email');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        console.log('--- Notificación Redsys recibida ---');
        
        // 1. Validar firma y obtener parámetros
        // req.body contiene los parámetros enviados en formato application/x-www-form-urlencoded por Redsys
        let redsysParams = req.body;
        
        // Si por alguna razón el body no se parseó correctamente de urlencoded
        if (typeof redsysParams === 'string') {
            const query = new URLSearchParams(redsysParams);
            redsysParams = Object.fromEntries(query.entries());
        }

        if (!redsysParams.Ds_MerchantParameters || !redsysParams.Ds_Signature) {
            return res.status(400).json({ error: 'Parámetros incompletos' });
        }

        const pago = verificarNotificacionRedsys(redsysParams);

        if (!pago.success) {
            console.warn(`Operación denegada en TPV Redsys: ${pago.orderId}`);
            return res.status(200).send('OK'); // Redsys requiere HTTP 200 incluso si el pago es KO
        }

        const meta = pago.metadata;
        const paymentId = pago.paymentId;

        // 2. Procesar según tipo de pago
        if (meta.tipo === 'inscripcion') {
            console.log(`Procesando inscripción Redsys para jugador: ${meta.jugador_id}, etapa: ${meta.etapa_id}`);
            
            // Registrar inscripción en Supabase
            const { error: inscError } = await supabase
                .from('inscripciones')
                .insert({
                    jugador_id: meta.jugador_id,
                    etapa_id: parseInt(meta.etapa_id),
                    stripe_payment_id: paymentId,
                    estado: 'pagada',
                    equipo_nombre: meta.equipo_nombre || null
                });

            if (inscError) {
                // Si ya existe, actualizar estado
                if (inscError.code === '23505') {
                    await supabase
                        .from('inscripciones')
                        .update({
                            estado: 'pagada',
                            stripe_payment_id: paymentId,
                            fecha_inscripcion: new Date().toISOString()
                        })
                        .eq('jugador_id', meta.jugador_id)
                        .eq('etapa_id', parseInt(meta.etapa_id));
                } else {
                    throw inscError;
                }
            }

            // Obtener datos para email
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

            const esCompeticion2027 = etapa && (etapa.id >= 300 || (etapa.nombre && etapa.nombre.includes('2027')) || new Date(etapa.fecha).getFullYear() >= 2027);
            const anioRequerido = esCompeticion2027 ? 2027 : 2026;
            const { data: licTemporada } = await supabase
                .from('licencias')
                .select('id')
                .eq('jugador_id', meta.jugador_id)
                .eq('anio', anioRequerido)
                .eq('estado', 'pagada')
                .maybeSingle();

            const tieneLicenciaParaEtapa = Boolean(licTemporada) || (!esCompeticion2027 && jugador.tiene_licencia);

            // Enviar email de confirmación
            try {
                if (tieneLicenciaParaEtapa) {
                    await enviarConfirmacionInscripcionConLicencia(jugador, etapa);
                } else {
                    await enviarConfirmacionInscripcionSinLicencia(jugador, etapa);
                }
            } catch (emailErr) {
                console.error('Error enviando email inscripción (Redsys):', emailErr.message);
            }

        } else if (meta.tipo === 'licencia') {
            console.log(`Procesando licencia Redsys para: ${meta.email}`);
            
            const anioActual = parseInt(meta.anio) || 2027;
            const emailNorm = (meta.email || '').trim().toLowerCase();
            const nickClean = (meta.nickname || '').trim();
            const nickNormEspacios = nickClean
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim();

            // Crear o actualizar jugador
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

            // Registrar licencia de forma idempotente
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
                        stripe_payment_id: paymentId,
                        estado: 'pagada'
                    });

                if (licError) throw licError;
            }

            await supabase
                .from('jugadores')
                .update({ anio_licencia: anioPrimeraEfectivo })
                .eq('id', jugadorId);

            // Obtener jugador completo para email
            const { data: jugador } = await supabase
                .from('jugadores')
                .select('*')
                .eq('id', jugadorId)
                .single();

            // Enviar email
            try {
                await enviarConfirmacionLicencia(jugador, anioActual);
            } catch (emailErr) {
                console.error('Error enviando email licencia (Redsys):', emailErr.message);
            }
        }

        return res.status(200).send('OK');

    } catch (error) {
        console.error('Error procesando notificación Redsys:', error);
        return res.status(500).json({ error: 'Error interno.' });
    }
};
