// ============================================================
// POST /api/inscripciones/crear-sesion-pago
// Crea una sesión de Stripe Checkout para inscribirse a una etapa
// ============================================================
const { supabase } = require('../../../lib/supabase');
const paymentGateway = require('../../../lib/payment-gateway');
const { calcularPrecioInscripcion } = require('../../../lib/pricing');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { nickname, email, etapa_id, equipo_nombre, incluye_balon } = req.body;

        if (!nickname || !nickname.trim() || !email || !email.trim() || !etapa_id) {
            return res.status(400).json({ error: 'Nickname, Email y Etapa son obligatorios.' });
        }

        const emailNorm = email.trim().toLowerCase();

        // 1. Verificar Etapa
        const { data: etapa } = await supabase.from('etapas').select('*').eq('id', etapa_id).single();
        if (!etapa) return res.status(404).json({ error: 'Etapa no encontrada.' });
        if (etapa.estado !== 'abierta') {
            return res.status(400).json({ error: 'La etapa no está abierta.' });
        }

        const isCopa = etapa.id === 100 || (etapa.nombre && etapa.nombre.toLowerCase().includes('copa'));
        // Si es Copa Catalana, por defecto incluye balón salvo que se envíe explícitamente false
        const conBalon = isCopa ? (incluye_balon !== false) : false;

        // 2. Calcular Precio
        const precio = calcularPrecioInscripcion(etapa, emailNorm, conBalon);

        // 3. Buscar o crear jugador
        let jugador;
        const { data: jugadorExistente } = await supabase.from('jugadores').select('*').eq('email', emailNorm).single();

        if (jugadorExistente) {
            jugador = jugadorExistente;
        } else {
            const { data: newPlayer, error: pErr } = await supabase.from('jugadores').insert({
                nickname: nickname.trim(),
                email: emailNorm,
                tiene_licencia: false
            }).select('*').single();
            if (pErr) throw pErr;
            jugador = newPlayer;
        }

        // 4. Verificar inscripción previa
        const { data: yaInscrito } = await supabase.from('inscripciones')
            .select('id').eq('jugador_id', jugador.id).eq('etapa_id', etapa_id).eq('estado', 'pagada').single();
        if (yaInscrito) return res.status(400).json({ error: 'Ya estás inscrito en esta etapa.' });

        // 5. Crear sesión Stripe / Redsys unificada
        const esEquipo = etapa.tipo === 'equipos';
        const orderId = `ins-${jugador.id}-${etapa_id}-${Date.now()}`;
        
        let concepto = `Inscripción ${etapa.nombre}`;
        if (esEquipo) {
            concepto += ` - Equipo: ${equipo_nombre}`;
        } else if (isCopa) {
            concepto += conBalon ? ' (con balón oficial)' : ' (sin balón)';
        }

        const paymentSession = await paymentGateway.crearSesionPago({
            orderId,
            amount: precio,
            concept: concepto,
            description: `Inscripción para ${jugador.nickname}`,
            metadata: {
                tipo: 'inscripcion',
                jugador_id: jugador.id,
                etapa_id: String(etapa_id),
                nickname: jugador.nickname,
                email: jugador.email,
                equipo_nombre: equipo_nombre || '',
                incluye_balon: conBalon ? 'true' : 'false'
            },
            successUrl: `${process.env.APP_URL}/src/pages/inscripciones.html?resultado=exito&etapa=${etapa_id}`,
            cancelUrl: `${process.env.APP_URL}/src/pages/inscripciones.html?resultado=cancelado`
        });

        return res.status(200).json({ url: paymentSession.url, precio, tieneLicencia: jugador.tiene_licencia });

    } catch (error) {
        console.error('Error inscripciones API:', error);
        return res.status(500).json({ error: 'Error interno.' });
    }
};
