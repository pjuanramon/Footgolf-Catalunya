const handler = require('../api/_logic/licencias/crear-sesion-pago');

const mockReq = {
    method: 'POST',
    body: {
        nickname: 'TestPlayer',
        email: 'testplayer@example.com',
        nombre_completo: 'Test Player Name',
        fecha_nacimiento: '1990-01-01',
        genero: 'M',
        telefono: '123456789',
        club: 'Club 1',
        es_renovacion: 'no',
        etapa_inicio: '1',
        ya_pagado: 'no',
        anio_primera_licencia: ''
    }
};

const mockRes = {
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(data) {
        console.log('STATUS:', this.statusCode || 200);
        console.log('JSON:', data);
        return this;
    }
};

handler(mockReq, mockRes).catch(err => {
    console.error('PROMISE ERROR:', err);
});
