// ============================================================
// Módulo F — Automatización de Etapas
// ============================================================
const { supabase } = require('./supabase');
const email = require('./email');

/**
 * Marca una etapa como finalizada.
 * @param {number} etapaId
 */
async function finalizarEtapa(etapaId) {
    const { error } = await supabase
        .from('etapas')
        .update({ estado: 'finalizada' })
        .eq('id', etapaId);

    if (error) throw new Error(`Error al finalizar etapa ${etapaId}: ${error.message}`);
}

/**
 * Identifica y abre la siguiente etapa tras la actual.
 * @param {number} etapaActualId
 * @returns {object|null} La siguiente etapa abierta, o null si no hay más
 */
async function abrirSiguienteEtapa(etapaActualId) {
    // Buscar la siguiente etapa por ID (la que tenga id > etapaActualId y estado 'cerrada')
    const { data: siguienteEtapa, error } = await supabase
        .from('etapas')
        .select('*')
        .eq('estado', 'cerrada')
        .gt('id', etapaActualId)
        .order('id', { ascending: true })
        .limit(1)
        .single();

    if (error || !siguienteEtapa) {
        console.log('No hay más etapas por abrir.');
        return null;
    }

    // Abrir la siguiente etapa
    const { error: updateError } = await supabase
        .from('etapas')
        .update({ estado: 'abierta' })
        .eq('id', siguienteEtapa.id);

    if (updateError) throw new Error(`Error al abrir etapa ${siguienteEtapa.id}: ${updateError.message}`);

    return siguienteEtapa;
}

/**
 * Calcula la fecha de cierre de inscripciones:
 * Viernes anterior a la fecha de la etapa, a las 13:00 hora España.
 * @param {string|Date} fechaEtapa
 * @returns {Date}
 */
function calcularFechaCierre(fechaEtapa) {
    const fecha = new Date(fechaEtapa);
    const diaSemana = fecha.getDay(); // 0=dom, 1=lun, ..., 5=vier, 6=sáb

    let diasRestar;
    switch (diaSemana) {
        case 0: diasRestar = 2; break;  // domingo → viernes = -2
        case 1: diasRestar = 3; break;  // lunes → viernes = -3
        case 2: diasRestar = 4; break;  // martes → viernes = -4
        case 3: diasRestar = 5; break;  // miércoles → viernes = -5
        case 4: diasRestar = 6; break;  // jueves → viernes = -6
        case 5: diasRestar = 7; break;  // viernes → viernes anterior = -7
        case 6: diasRestar = 1; break;  // sábado → viernes = -1
        default: diasRestar = 7;
    }

    const viernes = new Date(fecha);
    viernes.setDate(viernes.getDate() - diasRestar);
    viernes.setHours(13, 0, 0, 0); // 13:00

    return viernes;
}

/**
 * Calcula la fecha para enviar el recordatorio de cierre (24h antes del cierre).
 * @param {string|Date} fechaEtapa
 * @returns {Date}
 */
function calcularFechaRecordatorioCierre(fechaEtapa) {
    const fechaCierre = calcularFechaCierre(fechaEtapa);
    const recordatorio = new Date(fechaCierre);
    recordatorio.setDate(recordatorio.getDate() - 1); // 24h antes
    return recordatorio;
}

/**
 * Obtiene todos los jugadores con email.
 * @returns {Promise<Array>}
 */
async function obtenerTodosLosJugadores() {
    const { data, error } = await supabase
        .from('jugadores')
        .select('*')
        .not('email', 'is', null);

    if (error) throw error;
    return data || [];
}

/**
 * Obtiene jugadores sin licencia vigente.
 * @returns {Promise<Array>}
 */
async function obtenerJugadoresSinLicencia() {
    const { data, error } = await supabase
        .from('jugadores')
        .select('*')
        .eq('tiene_licencia', false)
        .not('email', 'is', null);

    if (error) throw error;
    return data || [];
}

/**
 * Ejecuta la automatización completa al procesar una etapa:
 * 1. Finalizar la etapa actual
 * 2. Abrir la siguiente etapa
 * 3. Enviar email de apertura
 * 4. Enviar email de resultados
 * 5. Enviar recordatorio de licencia a jugadores sin licencia
 *
 * @param {number} etapaId - ID de la etapa que se acaba de procesar
 * @returns {object} Resumen de la automatización
 */
async function ejecutarAutomatizacionCompleta(etapaId) {
    const resumen = {
        etapaFinalizada: etapaId,
        siguienteEtapa: null,
        emailsEnviados: {
            apertura: false,
            resultados: false,
            recordatorioLicencia: 0
        },
        fechaCierre: null,
        fechaRecordatorioCierre: null
    };

    // 1. Finalizar la etapa actual
    await finalizarEtapa(etapaId);

    // 2. Obtener la etapa actual para enviar resultados
    const { data: etapaActual } = await supabase
        .from('etapas')
        .select('*')
        .eq('id', etapaId)
        .single();

    // 3. Enviar email de resultados a todos
    try {
        const todosJugadores = await obtenerTodosLosJugadores();
        await email.enviarResultados(etapaActual, todosJugadores);
        resumen.emailsEnviados.resultados = true;
    } catch (e) {
        console.error('Error enviando resultados:', e.message);
    }

    // 4. Abrir la siguiente etapa
    const siguiente = await abrirSiguienteEtapa(etapaId);
    if (siguiente) {
        resumen.siguienteEtapa = {
            id: siguiente.id,
            nombre: siguiente.nombre,
            fecha: siguiente.fecha
        };

        // 5. Enviar email de apertura
        try {
            const todosJugadores = await obtenerTodosLosJugadores();
            await email.enviarAperturaEtapa(siguiente, todosJugadores);
            resumen.emailsEnviados.apertura = true;
        } catch (e) {
            console.error('Error enviando apertura:', e.message);
        }

        // 6. Calcular fechas de cierre y recordatorio
        resumen.fechaCierre = calcularFechaCierre(siguiente.fecha);
        resumen.fechaRecordatorioCierre = calcularFechaRecordatorioCierre(siguiente.fecha);
    }

    // 7. Enviar recordatorio de licencia a jugadores sin licencia
    try {
        const sinLicencia = await obtenerJugadoresSinLicencia();
        if (sinLicencia.length > 0) {
            await email.enviarRecordatorioLicencia(sinLicencia);
            resumen.emailsEnviados.recordatorioLicencia = sinLicencia.length;
        }
    } catch (e) {
        console.error('Error enviando recordatorio licencia:', e.message);
    }

    return resumen;
}

module.exports = {
    finalizarEtapa,
    abrirSiguienteEtapa,
    calcularFechaCierre,
    calcularFechaRecordatorioCierre,
    obtenerTodosLosJugadores,
    obtenerJugadoresSinLicencia,
    ejecutarAutomatizacionCompleta
};
