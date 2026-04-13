
const SUPABASE_URL = 'https://haiexkgguayurvdzqqsv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3NDk2MiwiZXhwIjoyMDg5MzUwOTYyfQ.6XHINMNQZvYUsnDkneaFj-Et96Y6SujuJ0L1V8f7tX8';

async function getLicensedPlayers() {
  const query = `${SUPABASE_URL}/rest/v1/jugadores?select=id,nombre_completo,nickname&tiene_licencia=eq.true`;
  
  const response = await fetch(query, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  const data = await response.json();
  if (data.error) {
    console.error('Error fetching data:', data);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

getLicensedPlayers().catch(console.error);
