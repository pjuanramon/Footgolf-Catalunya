// ============================================================
// Módulo de Matching — Vincular nombres del Excel con la BD
// ============================================================

/**
 * Normaliza un nombre: minúsculas, sin tildes, sin espacios extra.
 * IDÉNTICA a la función del motor de clasificación existente.
 * @param {string} name
 * @returns {string}
 */
function normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calcula la distancia de Levenshtein entre dos strings.
 * Para matching fuzzy.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshtein(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Intenta vincular un nombre del Excel con un jugador de la BD.
 * Orden de prioridad:
 * 1. Match exacto por nickname_normalizado
 * 2. Match exacto por nombre_completo normalizado
 * 3. Match fuzzy (Levenshtein ≤ 3)
 *
 * @param {string} excelName - Nombre tal como aparece en el Excel
 * @param {Array} dbPlayers - Array de jugadores de la BD
 * @returns {{ player: object|null, matchType: string, confidence: number }}
 */
function matchPlayerToDb(excelName, dbPlayers) {
    const normExcel = normalizeName(excelName);

    if (!normExcel) {
        return { player: null, matchType: 'none', confidence: 0 };
    }

    // 1. Match exacto por nickname normalizado
    const exactNickname = dbPlayers.find(p =>
        p.nickname_normalizado === normExcel
    );
    if (exactNickname) {
        return { player: exactNickname, matchType: 'exact_nickname', confidence: 1.0 };
    }

    // 2. Match exacto por nombre completo normalizado
    const exactName = dbPlayers.find(p =>
        normalizeName(p.nombre_completo) === normExcel
    );
    if (exactName) {
        return { player: exactName, matchType: 'exact_name', confidence: 0.95 };
    }

    // 3. Match fuzzy — buscar el más cercano con distancia ≤ 3
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const p of dbPlayers) {
        const d1 = levenshtein(normExcel, p.nickname_normalizado || '');
        const d2 = levenshtein(normExcel, normalizeName(p.nombre_completo) || '');
        const minD = Math.min(d1, d2);

        if (minD < bestDistance) {
            bestDistance = minD;
            bestMatch = p;
        }
    }

    if (bestMatch && bestDistance <= 3) {
        const maxLen = Math.max(normExcel.length, (bestMatch.nickname_normalizado || '').length);
        const confidence = 1 - (bestDistance / maxLen);
        return { player: bestMatch, matchType: 'fuzzy', confidence: Math.round(confidence * 100) / 100 };
    }

    // Sin match
    return { player: null, matchType: 'none', confidence: 0 };
}

module.exports = { normalizeName, matchPlayerToDb, levenshtein };
