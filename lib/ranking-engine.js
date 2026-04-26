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
    const categorias = ['Absoluta', 'Rookie', 'Senior 45 +', 'Senior 55 +', 'Damas', 'Junior'];
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
            if (cat === 'Damas' && r.dbPlayer.genero === 'femenino') return true;
            if (cat === 'Junior' && catsJugador.includes('Junior')) return true;
            
            return false;
        });

        // 2. Ordenar por score redondeado y desempate prioritario
        elegibles.sort((a, b) => {
            const scoreA = Math.round(Number(a.score));
            const scoreB = Math.round(Number(b.score));
            
            if (scoreA !== scoreB) return scoreA - scoreB;
            
            // Si empatan en score real (redondeado), el que ganó el desempate manual VA PRIMERO
            if (a.wonTie && !b.wonTie) return -1;
            if (!a.wonTie && b.wonTie) return 1;
            
            return 0;
        });

        // 3. Agrupar por score redondeado para manejar empates
        const grupos = [];
        elegibles.forEach(p => {
            const ultimoGrupo = grupos[grupos.length - 1];
            const currentScore = Math.round(Number(p.score));
            
            // Un jugador forma parte del mismo grupo si tiene el mismo score redondeado
            // Y SI AMBOS tienen el mismo estado de desempate (para separar al ganador del resto)
            if (ultimoGrupo && ultimoGrupo.score === currentScore && !!ultimoGrupo.wonTie === !!p.wonTie) {
                ultimoGrupo.jugadores.push(p);
            } else {
                grupos.push({ score: currentScore, wonTie: !!p.wonTie, jugadores: [p] });
            }
        });

        // 4. Asignar puntos
        let rank = 1;
        grupos.forEach(grupo => {
            const numJugadores = grupo.jugadores.length;
            
            // Si el grupo ganó un desempate, se lleva los puntos del rango actual
            // Si no hay desempate, se reparten la media de los puntos de los rangos que ocupan
            let puntosAsignar = 0;
            if (grupo.wonTie || numJugadores === 1) {
                puntosAsignar = POINTS_TABLE[rank] || 0;
            } else {
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
                    wonTie: !!p.wonTie,
                    dbPlayer: p.dbPlayer,
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

        const cats = ['puntos_absoluta', 'puntos_rookie', 'puntos_senior45', 'puntos_senior55', 'puntos_damas', 'puntos_junior'];
        cats.forEach(prop => {
            const catName = prop.replace('puntos_', '')
                .replace('senior45', 'Senior 45 +')
                .replace('senior55', 'Senior 55 +')
                .replace('absoluta', 'Absoluta')
                .replace('rookie', 'Rookie')
                .replace('femenino', 'Damas')
                .replace('damas', 'Damas')
                .replace('junior', 'Junior');
            
            if (!general[res.jugador_id].categorias[catName]) {
                general[res.jugador_id].categorias[catName] = { total: 0, etapas: [] };
            }

            if (res[prop] > 0 || res[prop] === 0) { // Keep 0s to show they played
                general[res.jugador_id].categorias[catName].etapas.push({
                    etapa_id: res.etapa_id,
                    puntos: res[prop]
                });
            }
        });
    });

    // Sumar mejores N
    Object.values(general).forEach(jugador => {
        Object.keys(jugador.categorias).forEach(cat => {
            const scores = jugador.categorias[cat].etapas
                .map(e => e.puntos)
                .sort((a, b) => b - a);
            const topN = scores.slice(0, mejoresN);
            jugador.categorias[cat].total = topN.reduce((sum, val) => sum + val, 0);
            
            // Map individual stages for the frontend (e1, e2, e3...)
            jugador.categorias[cat].etapas.forEach(e => {
                jugador.categorias[cat][`e${e.etapa_id}`] = e.puntos;
            });
        });
    });

    return Object.values(general);
}

module.exports = {
    calcularPuntosEtapa,
    calcularClasificacionGeneral
};
