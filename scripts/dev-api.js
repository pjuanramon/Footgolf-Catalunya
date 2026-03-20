const http = require('http');
const path = require('path');

// Cargar el handler principal
const mainHandler = require('../api/main');

const server = http.createServer(async (req, res) => {
    // Shim para compatibilidad con Vercel/Express
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return res;
    };

    // CORS simplificado para dev
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'x-admin-secret, Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    try {
        console.log(`[API DEV] ${req.method} ${req.url}`);
        await mainHandler(req, res);
    } catch (e) {
        console.error('[API DEV ERROR]', e);
        if (!res.writableEnded) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
        }
    }
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`\x1b[32m✔ Local API Server running on http://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[34mℹ Used by Vite proxy (/api -> :3001)\x1b[0m`);
});
