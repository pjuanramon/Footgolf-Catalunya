const { supabase } = require('../lib/supabase');

async function checkSchema() {
    // Try querying pg_tables or information_schema via RPC if available, or test various tables
    const potentialTables = [
        'payments', 'stripe', 'stripe_payments', 'stripe_events', 'webhooks', 
        'webhook_events', 'orders', 'pedidos', 'historial', 'audit_log', 
        'activity_log', 'transactions', 'transacciones', 'etapas_jugadores',
        'jugadores_etapas', 'participantes', 'inscritos'
    ];
    for (const t of potentialTables) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (!error) {
            console.log(`Found table: ${t}`);
        }
    }
}

checkSchema().catch(console.error);
