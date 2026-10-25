const xlsx = require('xlsx');
const wb = xlsx.readFile('C:\\Users\\pjuan\\OneDrive\\Areas\\Footgolf Catalunya\\FEFG\\Ranking Catalán 2025.xlsx');
const semWs = wb.Sheets['Semilla Liga Plata'];
const absWs = wb.Sheets['Ranking Absoulto'];

const semData = xlsx.utils.sheet_to_json(semWs, { range: 4 });
const absData = xlsx.utils.sheet_to_json(absWs, { range: 4 });

console.log('--- PLAYERS IN 2025 MP ---');
const mpPlayers = [
  'Jorge Santiago Buqueras',
  'Olivier TRESSENS',
  'JuanRa Perez',
  'Eduardo Martin Rodriguez',
  'Alberto Leiva cañada',
  'Jesús Pizarro Gonzálvez',
  'benito reyes gonzalez',
  'Xavi Leiva Cañada',
  'David Tellez Viana',
  'Joan Torre Rodríguez',
  'Ivan Luengo Robles',
  'Daniel Abril Amador',
  'Gustavo Verse',
  'J. Ortega'
];

for (const name of mpPlayers) {
  const sRow = semData.find(r => (r['FOOTGOLFER NICKNAME'] || '').toLowerCase().includes(name.split(' ')[0].toLowerCase()) || (r['FOOTGOLFER NICKNAME'] || '').toLowerCase().includes(name.split(' ')[1]?.toLowerCase() || 'xyz'));
  const aRow = absData.find(r => (r['FOOTGOLFER NICKNAME'] || '').toLowerCase().includes(name.split(' ')[0].toLowerCase()) || (r['FOOTGOLFER NICKNAME'] || '').toLowerCase().includes(name.split(' ')[1]?.toLowerCase() || 'xyz'));
  console.log(`${name}:`);
  console.log(`  Semilla Pos: ${sRow ? sRow['Posicion'] : 'N/A'}, Best 3: ${sRow ? sRow['Total'] : 'N/A'}`);
  console.log(`  Absoluto Pos: ${aRow ? aRow['Posicion'] : 'N/A'}, Total: ${aRow ? aRow['Total'] : 'N/A'}`);
}
