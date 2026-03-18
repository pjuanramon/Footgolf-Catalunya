// ============================================================
// Supabase Client — Backend (Service Role)
// ============================================================
const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('CRITICAL: Faltan variables de entorno de Supabase.');
        return null;
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

const supabase = getSupabaseClient();

module.exports = { supabase };
