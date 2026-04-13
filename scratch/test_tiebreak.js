
const { calcularPuntosEtapa } = require('../lib/ranking-engine');

const dbPlayers = [
    { id: 1, nickname: 'Ganador Tie', tiene_licencia: true, es_rookie: false, categorias_calculadas: ['Absoluta'] },
    { id: 2, nickname: 'Perdedor Tie', tiene_licencia: true, es_rookie: false, categorias_calculadas: ['Absoluta'] },
    { id: 3, nickname: 'Otro Empatado', tiene_licencia: true, es_rookie: false, categorias_calculadas: ['Absoluta'] }
];

const resultadosBrutos = [
    { score: 70, wonTie: false, dbPlayer: dbPlayers[0] }, // Winner of tie
    { score: 70, wonTie: false, dbPlayer: dbPlayers[1] },
    { score: 70, wonTie: false, dbPlayer: dbPlayers[2] }
];

console.log('--- TEST SIN DESEMPATE ---');
let pts = calcularPuntosEtapa(resultadosBrutos);
console.log(JSON.stringify(pts, null, 2));

console.log('\n--- TEST CON DESEMPATE (Jugador 1 gana) ---');
resultadosBrutos[0].wonTie = true;
pts = calcularPuntosEtapa(resultadosBrutos);
console.log(JSON.stringify(pts, null, 2));
