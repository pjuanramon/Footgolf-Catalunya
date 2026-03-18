// ============================================================
// Migración de resultados históricos (E1, E2) a la BD
// ============================================================
const { supabase } = require('../lib/supabase');
const { matchPlayerToDb } = require('../lib/matching');

const HISTORICAL = {
    masculino: [
        { name: "Jorge Santiago Buqueras", e1: 250, e2: 250 },
        { name: "Sergi Pahisa", e1: 200, e2: 230 },
        { name: "Xavi Leiva Cañada", e1: 230, e2: 190 },
        { name: "Olivier TRESSENS", e1: 190, e2: 215 },
        { name: "Chema Martínez Guillamon", e1: 215, e2: 165 },
        { name: "JuanRa Perez", e1: 180, e2: 180 },
        { name: "Alberto Leiva cañada", e1: 170, e2: 120 },
        { name: "Mario Morón Sancho", e1: 125, e2: 130 },
        { name: "ivan luengo robles", e1: 105, e2: 150 },
        { name: "Daniel Abril Amador", e1: 85, e2: 165 },
        { name: "Raúl Linares Ramos", e1: 105, e2: 140 },
        { name: "David Tellez Viana", e1: 145, e2: 80 },
        { name: "Eduardo Martin Rodriguez", e1: 0, e2: 200 },
        { name: "Fernando Martínez Guillamón", e1: 90, e2: 100 },
        { name: "Gustavo Verse", e1: 95, e2: 85 },
        { name: "Sergi Perez Vilar", e1: 160, e2: 0 },
        { name: "Nicola Perra", e1: 145, e2: 0 },
        { name: "Juan Medina", e1: 75, e2: 62 },
        { name: "Luca Rubinacci", e1: 70, e2: 66 },
        { name: "Gastón Masuck Cardozo", e1: 125, e2: 0 },
        { name: "David Linares Ramos", e1: 0, e2: 110 },
        { name: "Marc Company Salvat", e1: 0, e2: 92 },
        { name: "Erik Mata", e1: 0, e2: 92 },
        { name: "Jesús Pizarro Gonzálvez", e1: 80, e2: 0 },
        { name: "Jordi Ortega López", e1: 0, e2: 75 },
        { name: "Giacomo Bonacini", e1: 0, e2: 70 }
    ],
    rookie: [
        { name: "Sergi Pahisa", e1: 230, e2: 250 },
        { name: "Xavi Leiva Cañada", e1: 250, e2: 215 },
        { name: "Alberto Leiva cañada", e1: 215, e2: 160 },
        { name: "Mario Morón Sancho", e1: 185, e2: 170 },
        { name: "ivan luengo robles", e1: 165, e2: 190 },
        { name: "Raúl Linares Ramos", e1: 165, e2: 180 },
        { name: "Daniel Abril Amador", e1: 140, e2: 200 },
        { name: "David Tellez Viana", e1: 200, e2: 120 },
        { name: "Gustavo Verse", e1: 150, e2: 130 },
        { name: "Eduardo Martin Rodriguez", e1: 0, e2: 230 },
        { name: "Juan Medina", e1: 130, e2: 95 },
        { name: "Luca Rubinacci", e1: 120, e2: 100 },
        { name: "Gastón Masuck Cardozo", e1: 185, e2: 0 },
        { name: "Marc Company Salvat", e1: 0, e2: 145 },
        { name: "Erik Mata", e1: 0, e2: 145 },
        { name: "Jordi Ortega López", e1: 0, e2: 110 }
    ]
};

async function migrate() {
    console.log('--- Iniciando migración histórica ---');

    const { data: dbPlayers } = await supabase.from('jugadores').select('*');
    
    // Agrupar por jugador
    const mapResultados = new Map(); // player_id -> { e1: { abs, rook }, e2: { abs, rook } }

    const processCat = (cat, field) => {
        HISTORICAL[cat].forEach(p => {
            const match = matchPlayerToDb(p.name, dbPlayers);
            if (match.player) {
                const id = match.player.id;
                if (!mapResultados.has(id)) mapResultados.set(id, { e1: {}, e2: {} });
                
                if (p.e1 > 0) mapResultados.get(id).e1[field] = p.e1;
                if (p.e2 > 0) mapResultados.get(id).e2[field] = p.e2;
            } else {
                console.warn(`No se encontró match para: ${p.name}`);
            }
        });
    };

    processCat('masculino', 'absoluta');
    processCat('rookie', 'rookie');

    console.log(`Insertando resultados para ${mapResultados.size} jugadores...`);

    for (const [id, data] of mapResultados.entries()) {
        // E1
        if (Object.keys(data.e1).length > 0) {
            await supabase.from('resultados_etapas').upsert({
                etapa_id: 1,
                jugador_id: id,
                puntos_absoluta: data.e1.absoluta || 0,
                puntos_rookie: data.e1.rookie || 0
            }, { onConflict: 'etapa_id, jugador_id' });
        }
        // E2
        if (Object.keys(data.e2).length > 0) {
            await supabase.from('resultados_etapas').upsert({
                etapa_id: 2,
                jugador_id: id,
                puntos_absoluta: data.e2.absoluta || 0,
                puntos_rookie: data.e2.rookie || 0
            }, { onConflict: 'etapa_id, jugador_id' });
        }
    }

    console.log('--- Migración finalizada con éxito ---');
}

migrate();
