const Stripe = require('stripe');

const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
    console.error('Missing STRIPE_SECRET_KEY env variable');
    process.exit(1);
}

const stripe = Stripe(stripeSecret);

async function checkStripe() {
    const email = 'uve_1991@hotmail.com';
    console.log(`Checking Stripe for email: ${email}`);

    try {
        // Search for customers
        const customers = await stripe.customers.search({
            query: `email:'${email}'`,
        });
        console.log('Found customers:', customers.data);

        // Search for charges (we can list recent charges and filter, or use search if supported)
        // stripe.charges.search is supported in newer versions
        try {
            const charges = await stripe.charges.search({
                query: `customer_email:'${email}'`,
            });
            console.log('Found charges by customer_email:', charges.data);
        } catch (e) {
            console.log('Charges search failed or not supported:', e.message);
        }

        // Alternatively, list recent charges and check email in billing details
        const recentCharges = await stripe.charges.list({
            limit: 100,
        });
        
        const matchingCharges = recentCharges.data.filter(charge => {
            return (charge.billing_details && charge.billing_details.email && charge.billing_details.email.toLowerCase() === email.toLowerCase()) ||
                   (charge.receipt_email && charge.receipt_email.toLowerCase() === email.toLowerCase());
        });
        
        console.log('Matching charges in recent 100:', matchingCharges);

    } catch (error) {
        console.error('Stripe API Error:', error.message);
    }
}

checkStripe();
