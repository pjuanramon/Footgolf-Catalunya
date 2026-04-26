const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUve() {
    console.log('Searching for "uve" in jugadores...');

    const { data: jugadores, error } = await supabase
        .from('jugadores')
        .select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const matches = jugadores.filter(j => {
        const str = JSON.stringify(j).toLowerCase();
        return str.includes('uve') || str.includes('1991');
    });

    console.log('Matches found:', matches);
}

checkUve();
