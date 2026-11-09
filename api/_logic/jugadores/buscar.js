const { supabase } = require('../../../lib/supabase');
const { esJuanRa } = require('../../../lib/pricing');

/**
 * GET /api/jugadores/buscar?email=...
 * Busca un jugador por email y devuelve su nickname.
 */
module.exports = async function buscarJugador(req, res) {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ error: 'Falta el email.' });

        const emailClean = email.trim().toLowerCase();

        const { data: jugador, error } = await supabase
            .from('jugadores')
            .select('nickname, nombre_completo, id, tiene_licencia, club, fecha_nacimiento, genero, telefono, anio_licencia')
            .eq('email', emailClean)
            .single();

        if (error || !jugador) {
            return res.status(404).json({ error: 'Jugador no encontrado.' });
        }

        // Consultar licencias pagadas por temporada (ej: 2026, 2027)
        const { data: licencias } = await supabase
            .from('licencias')
            .select('anio, fecha_compra')
            .eq('jugador_id', jugador.id)
            .eq('estado', 'pagada')
            .order('anio', { ascending: false });

        // Caso especial para Juan Ramón Pérez (5€ en etapas individuales y Liga MP 2027)
        const isJuanRa = esJuanRa(emailClean, jugador.nickname || jugador.nombre_completo);

        return res.status(200).json({ 
            nickname: jugador.nickname,
            nombre_completo: jugador.nombre_completo,
            fecha_nacimiento: jugador.fecha_nacimiento,
            genero: jugador.genero,
            telefono: jugador.telefono,
            club: jugador.club,
            anio_licencia: jugador.anio_licencia,
            tiene_licencia: jugador.tiene_licencia,
            licencias_pagadas: licencias || [],
            isJuanRa: isJuanRa
        });
    } catch (e) {
        return res.status(500).json({ error: 'Error interno.' });
    }
};
