const fs = require('fs');

async function testAdmin() {
    const env = fs.readFileSync('.env', 'utf8');
    let adminSecret = '';
    env.split('\n').forEach(line => {
        const idx = line.indexOf('=');
        if (idx > -1 && line.substring(0, idx).trim() === 'ADMIN_SECRET') {
            adminSecret = line.substring(idx + 1).trim();
        }
    });

    console.log('Admin Secret found:', !!adminSecret);

    let attempts = 0;
    while (attempts < 10) {
        attempts++;
        console.log(`Attempt ${attempts}...`);
        try {
            const res = await fetch('https://footgolfcatalunya.com/api/admin/inscripciones-detalle?etapa_id=100', {
                headers: {
                    'x-admin-secret': adminSecret
                }
            });
            console.log(`Status: ${res.status}`);
            if (res.status === 200) {
                const data = await res.json();
                console.log('Data received:');
                console.log(JSON.stringify(data, null, 2));
                return;
            } else {
                const text = await res.text();
                console.log('Response body:', text);
            }
        } catch (e) {
            console.error('Fetch error:', e.message);
        }
        await new Promise(r => setTimeout(r, 4000));
    }
}

testAdmin().catch(console.error);
