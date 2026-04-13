
const SUPABASE_URL = 'https://haiexkgguayurvdzqqsv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3NDk2MiwiZXhwIjoyMDg5MzUwOTYyfQ.6XHINMNQZvYUsnDkneaFj-Et96Y6SujuJ0L1V8f7tX8';

const aliasMapping = {
  "David Linares Ramos": "D. Linares",
  "Eduardo Martin Rodriguez": "E. MartinRdz",
  "Jordi Ortega López": "J. Ortega",
  "Sergi Pahisa Garcia": "S. Pahisa",
  "Jorge Santiago Buqueras": "J. Santiago",
  "Marc Arrebola Sans": "M. Arrebola",
  "Marc Company Salvat": "M. Company",
  "Mario Morón Sancho": "M. Morón",
  "Mario Morón Sacnho": "M. Morón",
  "Xavi Leiva Cañada": "X. Leiva",
  "Sergi Perez Vilar": "S. Perez",
  "Lucía Bernuz Culebras": "L. Bernuz",
  "Daniel Abril Amador": "D. Abril",
  "David Tellez Viana": "D. Tellez",
  "Gustavo Alejandro Verse": "G. Verse",
  "Ivan luengo robles": "I. Luengo",
  "Luca Rubinacci": "L. Rubinacci",
  "Juan Ramón Pérez González": "J. Perez",
  "Giacomo Bonacini": "G. Bonacini",
  "Chema Martínez Guillamon": "C. Martínez2114",
  "Tressens Olivier": "O. Tressens",
  "David Rojo Demgra": "D. Rojo",
  "Raúl Linares": "R. Linares",
  "Nando Martínez Guillamón": "F. Martínez2107",
  "Gastón Masuck Cardozo": "G. Masuck",
  "Alberto Leiva cañada ": "A. Leiva",
  "Joan Torre Rodríguez": "J. Torre",
  "Erik Matarrubia Galera": "E. Matarrubia",
  "Jordi Martin Garcia": "J. Martín3955",
  "Santiago Jimenez Ortiz": "S. Jimenez",
  "Jesus Pizarro Gonzálvez": "J. Pizarro",
  "Alberto Salazar Fernández": "A. Salazar"
};

async function updateAliases() {
  const query = `${SUPABASE_URL}/rest/v1/jugadores?select=id,nombre_completo`;
  const response = await fetch(query, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const players = await response.json();

  for (const player of players) {
    if (!player.nombre_completo) continue;
    
    const alias = aliasMapping[player.nombre_completo.trim()];
    if (alias) {
      console.log(`Actualizando ${player.nombre_completo} -> ${alias}`);
      await fetch(`${SUPABASE_URL}/rest/v1/jugadores?id=eq.${player.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ alias_footgolfworld: alias })
      });
    }
  }
  console.log('Actualización completada.');
}

updateAliases().catch(console.error);
