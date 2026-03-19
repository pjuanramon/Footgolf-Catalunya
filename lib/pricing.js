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
 * - Si el jugador es nuevo → precio dinámico basado en su PRIMERA etapa:
 *   Precio = 30 - ((etapaInicio - 1) / 12) * 30
 *   Ejemplo: Etapa 1 -> 30€. Etapa 7 -> 15€.
 *
 * @param {object} jugador - Objeto jugador de la BD (puede ser null)
 * @param {boolean} esAntiguo - Si el usuario marcó que ya tenía licencia anteriormente
 * @param {number} etapaInicio - El número de la etapa donde empieza (1 a 12)
 * @returns {number} Precio en euros (mínimo 0)
 */
function calcularPrecioLicencia(jugador, esAntiguo, etapaInicio = 1) {
    // Override manual siempre tiene prioridad si el jugador existe
    if (jugador && jugador.override_precio_licencia != null) {
        return Number(jugador.override_precio_licencia);
    }

    // Jugador antiguo → 30€ fijos
    if (esAntiguo) {
        return PRECIO_LICENCIA_BASE;
    }

    // Jugador nuevo → precio dinámico basado en la etapa de inicio
    // Usamos 12 como base de la temporada individual
    const etapasPasadas = Math.max(0, etapaInicio - 1);
    const descuento = (etapasPasadas / 12) * PRECIO_LICENCIA_BASE;
    const precio = PRECIO_LICENCIA_BASE - descuento;

    // Redondear a 2 decimales, mínimo 5€ (para cubrir costes mínimos si fuera el caso)
    return Math.max(5, Math.round(precio * 100) / 100);
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
