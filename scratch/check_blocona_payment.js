const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPayment() {
    // 1. Get licencias for Sergio Blocona
    const { data: licencias, error: licError } = await supabase
        .from('licencias')
        .select('*')
        .eq('jugador_id', 'bff5a630-b46c-4beb-97b3-20c3c8f361ca');
        
    if (licError) {
        console.error('Error fetching licencias:', licError);
        return;
    }

    console.log('--- LICENCIAS FOR SERGIO BLOCONA ---');
    console.log(licencias);
}
checkPayment();
