const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function revertSergio() {
    const { data, error } = await supabase
        .from('jugadores')
        .update({ tiene_licencia: false })
        .eq('id', 'bff5a630-b46c-4beb-97b3-20c3c8f361ca')
        .select();
        
    if (error) {
        console.error('Error updating Sergio:', error);
    } else {
        console.log('Sergio reverted successfully:', data);
    }
}
revertSergio();
