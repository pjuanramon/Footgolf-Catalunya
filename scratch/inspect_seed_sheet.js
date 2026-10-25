const xlsx = require('xlsx');
const wb = xlsx.readFile('C:\\Users\\pjuan\\OneDrive\\Areas\\Footgolf Catalunya\\FEFG\\Ranking Catalán 2025.xlsx');
const ws = wb.Sheets['Semilla Liga Plata'];
console.log('Semilla Liga Plata cell formula/values:');
for (let r = 0; r <= 16; r++) {
  const row = [];
  for (let c = 0; c < 15; c++) {
    const addr = xlsx.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (cell) {
      row.push(cell.f ? `=${cell.f} (${cell.v})` : cell.v);
    } else {
      row.push('');
    }
  }
  console.log(`Row ${r}:`, row.join(' | '));
}
