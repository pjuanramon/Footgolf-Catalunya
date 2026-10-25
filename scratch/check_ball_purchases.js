const { supabase } = require('../lib/supabase');
const { stripe } = require('../lib/stripe');

async function checkDetails() {
    // 1. Get all inscriptions for etapa 100
    const { data: inscripciones, error } = await supabase
        .from('inscripciones')
        .select('*, jugadores(*)')
        .eq('etapa_id', 100)
        .order('fecha_inscripcion', { ascending: true });

    if (error) {
        console.error('Error supabase:', error);
        return;
    }

    console.log(`Total inscripciones etapa 100: ${inscripciones.length}`);

    for (const ins of inscripciones) {
        const pId = ins.stripe_payment_id;
        let amount = null;
        let currency = null;
        let metadata = null;
        let description = null;

        if (pId && pId.startsWith('pi_')) {
            try {
                const pi = await stripe.paymentIntents.retrieve(pId);
                amount = pi.amount / 100; // in euros
                currency = pi.currency;
                metadata = pi.metadata;
                description = pi.description;
            } catch (err) {
                console.error(`Error retrieving PI ${pId}:`, err.message);
            }
        }

        const jug = ins.jugadores || {};
        console.log({
            inscripcion_id: ins.id,
            fecha: ins.fecha_inscripcion,
            jugador: jug.nombre_completo || jug.nickname || ins.nombre_manual,
            nickname: jug.nickname,
            email: jug.email,
            estado: ins.estado,
            stripe_payment_id: pId,
            importe: amount,
            descripcion: description,
            metadata: metadata,
            compro_balon: metadata ? metadata.incluye_balon : (amount === 60 || amount === 22 ? 'SI (por importe)' : 'NO (por importe)')
        });
    }

    // Also check if there are any other stages or recent inscripciones
    const { data: recentInsc } = await supabase
        .from('inscripciones')
        .select('*, jugadores(*), etapas(*)')
        .order('fecha_inscripcion', { ascending: false })
        .limit(15);

    console.log('\n--- RECENT INSCRIPCIONES (ALL ETAPAS) ---');
    for (const r of recentInsc) {
        console.log(`Etapa ${r.etapa_id} (${r.etapas?.nombre}): ${r.jugadores?.nombre_completo || r.jugadores?.nickname || r.nombre_manual} - Fecha: ${r.fecha_inscripcion} - Stripe: ${r.stripe_payment_id}`);
    }
}

checkDetails().catch(console.error);
