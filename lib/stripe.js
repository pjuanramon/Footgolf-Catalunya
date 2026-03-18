// ============================================================
// Stripe Client + Helpers
// ============================================================
const Stripe = require('stripe');

function getStripeClient() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        console.error('CRITICAL: Falta STRIPE_SECRET_KEY.');
        return null;
    }
    return new Stripe(key, { apiVersion: '2023-10-16' });
}

const stripe = getStripeClient();

/**
 * Verifica la firma de un webhook de Stripe.
 * @param {Buffer} rawBody - Body crudo de la request
 * @param {string} signature - Header stripe-signature
 * @param {string} secret - Webhook secret
 * @returns {object} Evento de Stripe verificado
 */
function verificarWebhook(rawBody, signature, secret) {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

module.exports = { stripe, verificarWebhook };
