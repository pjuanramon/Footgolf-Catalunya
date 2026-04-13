
const SUPABASE_URL = 'https://haiexkgguayurvdzqqsv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3NDk2MiwiZXhwIjoyMDg5MzUwOTYyfQ.6XHINMNQZvYUsnDkneaFj-Et96Y6SujuJ0L1V8f7tX8';

function formatInternalName(nombre_completo, nickname) {
    let full = '';
    if (nombre_completo && nombre_completo !== 'null') {
        full = nombre_completo;
    } else {
        full = nickname || '';
    }
    
    full = full.trim();
    if (!full) return '';
    const parts = full.split(' ').filter(p => p.length > 0);
    if (parts.length < 1) return '';
    
    const firstLetter = parts[0][0].toLowerCase();
    // Try to find the surname. If it's "Juan Ramon Perez", surname is "Perez"?
    // "Juan Raperes" -> "j.perez" implies first surname.
    const surname = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : parts[0].toLowerCase();
    
    // Wait, the user said "primera letra del nombre + primer apellido".
    // For "Juan Ramón Pérez González", primer apellido is Pérez.
    const primerApellido = parts.length > 1 ? parts[parts.length > 2 ? 1 : 1].toLowerCase() : parts[0].toLowerCase();
    // Usually parts[0] = name, parts[1] = first surname.
    const surnameToUse = parts.length > 1 ? parts[1].toLowerCase() : parts[0].toLowerCase();

    // Normalize (remove accents)
    const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, "n");
    
    return `${normalize(firstLetter)}.${normalize(surnameToUse)}`;
}

async function getInscribedPlayers() {
  const query = `${SUPABASE_URL}/rest/v1/inscripciones?etapa_id=eq.4&select=jugadores(nombre_completo,nickname,categorias_calculadas)&estado=eq.pagada`;
  
  const response = await fetch(query, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  const data = await response.json();
  if (data.error || !Array.isArray(data)) {
    console.error('Error fetching data:', data);
    return;
  }

  const players = data.map(item => {
    const j = item.jugadores;
    return {
      nickname: j.nickname,
      nombre_completo: j.nombre_completo,
      internal_name: formatInternalName(j.nombre_completo, j.nickname),
      categories: j.categorias_calculadas
    };
  });
  console.log(JSON.stringify(players, null, 2));
}

getInscribedPlayers().catch(console.error);
