// ============================================================
// Stripe Client + Helpers
// ============================================================
const Stripe = require('stripe');

let stripeInstance = null;

function getStripeClient() {
    if (stripeInstance) return stripeInstance;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        console.error('CRITICAL: Falta STRIPE_SECRET_KEY.');
        return null;
    }
    stripeInstance = new Stripe(key, { apiVersion: '2023-10-16' });
    return stripeInstance;
}

/**
 * Verifica la firma de un webhook de Stripe.
 * @param {Buffer} rawBody - Body crudo de la request
 * @param {string} signature - Header stripe-signature
 * @param {string} secret - Webhook secret
 * @returns {object} Evento de Stripe verificado
 */
function verificarWebhook(rawBody, signature, secret) {
    const client = getStripeClient();
    if (!client) throw new Error('Stripe client not initialized');
    return client.webhooks.constructEvent(rawBody, signature, secret);
}

module.exports = {
    get stripe() {
        return getStripeClient();
    },
    verificarWebhook
};
