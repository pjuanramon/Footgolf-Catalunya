// ============================================================
// Ranking Engine - Footgolf Catalunya
// Automatización del cálculo de puntos y clasificaciones
// ============================================================

const POINTS_TABLE = [0, 250, 230, 215, 200, 190, 180, 170, 160, 150, 140, 130, 120, 110, 100, 95, 90, 85, 80, 75, 70, 66, 62, 58, 54, 50, 47, 44, 41, 38, 35, 33, 31, 29, 27, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

/**
 * Calcula los puntos de una etapa para todos los jugadores.
 * @param {Array} resultadosBrutos - Lista de objetos { rawName, normName, score, dbPlayer, isUnlicensed }
 * @returns {Array} Resultados procesados con puntos por categoría
 */
function calcularPuntosEtapa(resultadosBrutos) {
    const categorias = ['Absoluta', 'Rookie', 'Senior 45 +', 'Senior 55 +', 'Femenino'];
    const resultadoFinal = new Map(); // jugador_id -> { puntos: { cat: pts }, score }

    categorias.forEach(cat => {
        // 1. Filtrar jugadores que pertenecen a esta categoría
        let elegibles = resultadosBrutos.filter(r => {
            if (!r.dbPlayer) return false;
            if (!r.dbPlayer.tiene_licencia) return false;

            const catsJugador = r.dbPlayer.categorias_calculadas || [];
            
            if (cat === 'Absoluta') return true;
            if (cat === 'Rookie') return r.dbPlayer.es_rookie;
            if (catsJugador.includes(cat)) return true;
            
            // Fallback para género si no está en JSONB
            if (cat === 'Femenino' && r.dbPlayer.genero === 'femenino') return true;
            
            return false;
        });

        // 2. Ordenar por score (ascendente, menos es mejor)
        elegibles.sort((a, b) => a.score - b.score);

        // 3. Agrupar por score para manejar empates
        const grupos = [];
        elegibles.forEach(p => {
            const ultimoGrupo = grupos[grupos.length - 1];
            if (ultimoGrupo && ultimoGrupo.score === p.score) {
                ultimoGrupo.jugadores.push(p);
            } else {
                grupos.push({ score: p.score, jugadores: [p] });
            }
        });

        // 4. Asignar puntos
        let rank = 1;
        grupos.forEach(grupo => {
            const numJugadores = grupo.jugadores.length;
            let puntosAsignar = 0;

            if (numJugadores === 1) {
                puntosAsignar = POINTS_TABLE[rank] || 0;
            } else {
                // Promedio de puntos en caso de empate (según motor original para puestos no-top)
                // Nota: El motor original tiene resoluciones manuales para Top 3.
                // Aquí implementamos promedio general por ahora.
                let sumaPuntos = 0;
                for (let i = 0; i < numJugadores; i++) {
                    sumaPuntos += (POINTS_TABLE[rank + i] || 0);
                }
                puntosAsignar = sumaPuntos / numJugadores;
            }

            grupo.jugadores.forEach(p => {
                const data = resultadoFinal.get(p.dbPlayer.id) || { 
                    jugador_id: p.dbPlayer.id,
                    nickname: p.dbPlayer.nickname,
                    score: p.score,
                    puntos: {} 
                };
                data.puntos[cat] = puntosAsignar;
                resultadoFinal.set(p.dbPlayer.id, data);
            });

            rank += numJugadores;
        });
    });

    return Array.from(resultadoFinal.values());
}

/**
 * Calcula la clasificación general sumando las mejores N etapas.
 * @param {Array} todosLosResultados - Todos los registros de resultados_etapas
 * @param {number} mejoresN - Número de mejores puntuaciones a sumar (default 8)
 */
function calcularClasificacionGeneral(todosLosResultados, mejoresN = 8) {
    const general = {}; // jugador_id -> { nickname, categorias: { cat: { total, detalles: [] } } }

    todosLosResultados.forEach(res => {
        if (!general[res.jugador_id]) {
            general[res.jugador_id] = {
                id: res.jugador_id,
                nickname: res.jugadores.nickname,
                categorias: {}
            };
        }

        const cats = ['puntos_absoluta', 'puntos_rookie', 'puntos_senior45', 'puntos_senior55', 'puntos_femenino'];
        cats.forEach(prop => {
            const catName = prop.replace('puntos_', '').replace('senior45', 'Senior 45 +').replace('senior55', 'Senior 55 +').replace('absoluta', 'Absoluta').replace('rookie', 'Rookie').replace('femenino', 'Femenino');
            
            if (!general[res.jugador_id].categorias[catName]) {
                general[res.jugador_id].categorias[catName] = { total: 0, etapas: [] };
            }

            if (res[prop] > 0) {
                general[res.jugador_id].categorias[catName].etapas.push(res[prop]);
            }
        });
    });

    // Sumar mejores N
    Object.values(general).forEach(jugador => {
        Object.keys(jugador.categorias).forEach(cat => {
            const scores = jugador.categorias[cat].etapas.sort((a, b) => b - a);
            const topN = scores.slice(0, mejoresN);
            jugador.categorias[cat].total = topN.reduce((sum, val) => sum + val, 0);
        });
    });

    return Object.values(general);
}

module.exports = {
    calcularPuntosEtapa,
    calcularClasificacionGeneral
};
