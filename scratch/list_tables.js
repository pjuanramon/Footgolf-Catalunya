const { supabase } = require('../lib/supabase');

async function listTables() {
    // Check common table names
    const candidateTables = [
        'inscripciones', 'jugadores', 'etapas', 'licencias', 'pagos', 'pedidos', 
        'transacciones', 'orders', 'notificaciones', 'logs', 'stripe_logs', 
        'compras', 'material', 'balones', 'configuracion'
    ];

    for (const t of candidateTables) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (!error) {
            console.log(`Table exists: ${t} (sample count: ${data ? data.length : 0})`);
        }
    }
}

listTables().catch(console.error);
