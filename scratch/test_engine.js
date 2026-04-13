const { calcularClasificacionGeneral } = require('../lib/ranking-engine');

const mockResults = [
    { jugador_id: '1', jugadores: { nickname: 'Jorge' }, etapa_id: 1, puntos_absoluta: 250 },
    { jugador_id: '1', jugadores: { nickname: 'Jorge' }, etapa_id: 2, puntos_absoluta: 250 }
];

const general = calcularClasificacionGeneral(mockResults);
console.log(JSON.stringify(general, null, 2));

const catData = general[0].categorias['Absoluta'];
console.log('Resulting Player Object:', {
    name: general[0].nickname,
    total: catData.total,
    ...catData
});
