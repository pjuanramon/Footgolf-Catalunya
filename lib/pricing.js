// ============================================================
// Módulo D — Lógica de Precios
// ============================================================

const PRECIO_INSCRIPCION = 22; // Siempre 22€
const PRECIO_LICENCIA_BASE = 30; // Precio base para jugadores antiguos
const TOTAL_JORNADAS = 10; // Total de jornadas en la temporada

/**
 * Calcula el precio de la licencia para un jugador.
 *
 * Reglas:
 * - Si el jugador tiene override_precio_licencia → usar override
 * - Si el jugador es antiguo (ya tenía licencia en temporadas anteriores) → 30€
 * - Si el jugador es nuevo → precio dinámico: 30 - (jornadas_jugadas / jornadas_totales) * 30
 *   Esto hace que cuanto más tarde en la temporada, más barato sea.
 *
 * @param {object} jugador - Objeto jugador de la BD
 * @param {number} jornadasJugadas - Número de jornadas ya disputadas
 * @returns {number} Precio en euros (mínimo 0)
 */
function calcularPrecioLicencia(jugador, jornadasJugadas) {
    // Override manual siempre tiene prioridad
    if (jugador && jugador.override_precio_licencia != null) {
        return Number(jugador.override_precio_licencia);
    }

    // Jugador antiguo (ya tenía licencia en alguna temporada anterior)
    if (jugador && jugador.anio_licencia != null) {
        const anioActual = new Date().getFullYear();
        if (jugador.anio_licencia < anioActual) {
            return PRECIO_LICENCIA_BASE;
        }
    }

    // Jugador nuevo → precio dinámico
    // Cuanto más avanzada la temporada, más barato
    const descuento = (jornadasJugadas / TOTAL_JORNADAS) * PRECIO_LICENCIA_BASE;
    const precio = PRECIO_LICENCIA_BASE - descuento;

    // Redondear a 2 decimales, mínimo 0
    return Math.max(0, Math.round(precio * 100) / 100);
}

/**
 * Obtiene el número de jornadas ya finalizadas.
 * @param {object} supabase - Cliente Supabase
 * @returns {Promise<number>}
 */
async function obtenerJornadasJugadas(supabase) {
    const { data, error } = await supabase
        .from('etapas')
        .select('id')
        .eq('estado', 'finalizada');

    if (error) throw error;
    return data ? data.length : 0;
}

module.exports = {
    PRECIO_INSCRIPCION,
    PRECIO_LICENCIA_BASE,
    TOTAL_JORNADAS,
    calcularPrecioLicencia,
    obtenerJornadasJugadas
};
