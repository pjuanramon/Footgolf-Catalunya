const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmail() {
    const email = 'uve_1991@hotmail.com';
    console.log(`Checking email: ${email}`);

    // Check jugadores table
    const { data: jugadores, error: err1 } = await supabase
        .from('jugadores')
        .select('*')
        .ilike('email', email);

    if (err1) console.error('Error checking jugadores:', err1);
    else console.log('Found in jugadores:', jugadores);
}

checkEmail();
