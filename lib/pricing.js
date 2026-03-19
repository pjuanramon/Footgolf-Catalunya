// ============================================================
// Módulo D — Lógica de Precios
// ============================================================

const PRECIO_INSCRIPCION = 22; // General
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
function calcularPrecioLicencia(jugador = null, esAntiguo = false, etapaInicio = 1, yaPagado = false) {
    if (yaPagado) return 0;
    
    // Override manual prioridad máxima
    if (jugador && jugador.override_precio_licencia != null) {
        return Number(jugador.override_precio_licencia);
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
 * Individual: 22€ (Especial JuanRa: 5€)
 * Equipos: Basado en el precio_equipo de la etapa (habitualmente 110€)
 */
function calcularPrecioInscripcion(etapa, emailJugador = '') {
    if (etapa.tipo === 'equipos') {
        return etapa.precio_equipo || 110;
    }
    
    // Caso especial para el administrador (JuanRa)
    const emailsAdmin = ['pjuanramon@hotmail.com', 'juanra@footgolfcatalunya.com'];
    if (emailJugador && emailsAdmin.includes(emailJugador.toLowerCase())) {
        return 5;
    }

    return PRECIO_INSCRIPCION;
}

module.exports = {
    calcularPrecioLicencia,
    calcularPrecioInscripcion
};
