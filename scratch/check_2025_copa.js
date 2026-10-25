const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: etapas, error } = await supabase.from('etapas').select('id, nombre, fecha, estado').order('id');
  if (error) console.error(error);
  else console.log('Etapas:', etapas);

  // Search if any table has match play or 2025
  const { data: resultados, error: resErr } = await supabase.from('resultados_etapas').select('*').limit(5);
  console.log('Sample resultados:', resultados);
}

main();
