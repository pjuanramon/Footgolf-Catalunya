const { supabase } = require('../../../lib/supabase');

/**
 * POST /api/admin/modificar-jugador
 * { id, nombre_completo, nickname, email, ... }
 */
module.exports = async function modificarJugador(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
    
    try {
        const { 
            id, 
            nombre_completo, 
            nickname, 
            email, 
            telefono, 
            fecha_nacimiento, 
            genero, 
            club,
            tiene_licencia,
            anio_licencia
        } = req.body;

        if (!id) return res.status(400).json({ error: 'Falta ID de jugador' });

        const updateData = {};
        if (nombre_completo !== undefined) updateData.nombre_completo = nombre_completo;
        if (nickname !== undefined) updateData.nickname = nickname;
        if (email !== undefined) updateData.email = email;
        if (telefono !== undefined) updateData.telefono = telefono;
        if (fecha_nacimiento !== undefined) updateData.fecha_nacimiento = fecha_nacimiento;
        if (genero !== undefined) updateData.genero = genero;
        if (club !== undefined) updateData.club = club;
        if (tiene_licencia !== undefined) updateData.tiene_licencia = (tiene_licencia === true || tiene_licencia === 'true');
        if (anio_licencia !== undefined) updateData.anio_licencia = parseInt(anio_licencia) || null;

        const { data, error } = await supabase
            .from('jugadores')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;
        
        return res.status(200).json({ ok: true, data });
    } catch (e) {
        console.error('Error modificando jugador:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
