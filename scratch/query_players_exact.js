const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx !== -1) {
        const k = line.substring(0, idx).trim();
        const v = line.substring(idx + 1).trim();
        env[k] = v;
    }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: players, error } = await supabase
        .from('jugadores')
        .select('id, nombre_completo, nickname, alias_footgolfworld');

    if (error) {
        console.error('Error fetching players:', error);
        return;
    }

    const searchNames = ['luengo', 'leiva', 'pahisa', 'perez', 'jordi', 'moreno', 'abril', 'santiago', 'medina', 'gustavo', 'tellez', 'pizarro'];
    const matched = players.filter(p => {
        const str = `${p.nombre_completo} ${p.nickname} ${p.alias_footgolfworld}`.toLowerCase();
        return searchNames.some(s => str.includes(s));
    });

    console.log(JSON.stringify(matched, null, 2));
}

main().catch(console.error);
