// ============================================================
// Módulo D — Lógica de Precios
// ============================================================

const PRECIO_INSCRIPCION = 22; // General Liga
const PRECIO_COPA_BASE = 45; // Copa Catalana sin balón
const PRECIO_BALON = 15; // Suplemento balón oficial
const PRECIO_LICENCIA_BASE = 30; // Renovaciones

/**
 * Calcula el precio de la licencia basándose en si es renovación y la etapa de inicio.
 * O si ya ha pagado físicamente (0€).
 * 
 * @param {object} jugador - Objeto jugador (opcional)
 * @param {boolean} esAntiguo - Si es renovación
 * @param {number} etapaInicio - Etapa de inicio (1-12)
 * @param {boolean} yaPagado - Si ya ha pagado físicamente
 */
function calcularPrecioLicencia(jugador = null, esAntiguo = false, etapaInicio = 1, yaPagado = false, anio = 2026) {
    if (yaPagado) return 0;
    
    // Override manual prioridad máxima
    if (jugador && jugador.override_precio_licencia != null) {
        return Number(jugador.override_precio_licencia);
    }

    // Temporada 2027: Pronto pago de 25€ hasta el 31 de diciembre de 2026
    if (Number(anio) === 2027) {
        const ahora = new Date();
        const limiteProntoPago = new Date('2026-12-31T23:59:59+01:00');
        if (ahora <= limiteProntoPago) {
            return 25;
        }
        if (esAntiguo) return PRECIO_LICENCIA_BASE;
        let precio27 = PRECIO_LICENCIA_BASE - ((etapaInicio - 1) / 10) * PRECIO_LICENCIA_BASE;
        return Math.max(5, Math.round(precio27));
    }

    // Si es renovación: 30€
    if (esAntiguo) return PRECIO_LICENCIA_BASE;

    // Si es nueva: Prorrateado
    // Precio = 30 - ((etapaInicio - 1) / 12) * 30
    let precio = PRECIO_LICENCIA_BASE - ((etapaInicio - 1) / 12) * PRECIO_LICENCIA_BASE;
    return Math.max(5, Math.round(precio));
}

/**
 * Calcula el precio de inscripción.
 * Individual Liga: 22€ (Especial JuanRa: 5€)
 * Copa Catalana: 60€ con balón / 45€ sin balón (Especial JuanRa: 22€ con balón / 7€ sin balón)
 * Equipos: Basado en el precio_equipo de la etapa (habitualmente 110€)
 */
function calcularPrecioInscripcion(etapa, emailJugador = '', incluyeBalon = false) {
    if (etapa.tipo === 'equipos') {
        return etapa.precio_equipo || 110;
    }
    
    const isCopa = etapa.id === 100 || (etapa.nombre && etapa.nombre.toLowerCase().includes('copa'));

    // Caso especial para el administrador (JuanRa)
    const emailsAdmin = ['pjuanramon@hotmail.com', 'juanra@footgolfcatalunya.com'];
    if (emailJugador && emailsAdmin.includes(emailJugador.toLowerCase())) {
        if (isCopa) {
            return incluyeBalon ? (7 + PRECIO_BALON) : 7;
        }
        return 5;
    }

    if (isCopa) {
        return incluyeBalon ? (PRECIO_COPA_BASE + PRECIO_BALON) : PRECIO_COPA_BASE;
    }

    return etapa.precio_inscripcion || PRECIO_INSCRIPCION;
}

module.exports = {
    calcularPrecioLicencia,
    calcularPrecioInscripcion
};
