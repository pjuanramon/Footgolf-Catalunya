const xlsx = require('xlsx');
const wb = xlsx.readFile('C:\\Users\\pjuan\\OneDrive\\Areas\\Footgolf Catalunya\\FEFG\\Ranking Catalán 2025.xlsx');
console.log('Sheets:', wb.SheetNames);
for (const s of wb.SheetNames) {
  const ws = wb.Sheets[s];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log('Sheet:', s, 'rows:', data.length);
  if (data.length > 0) {
    console.log('  Row 0:', data[0]);
    if (data.length > 1) console.log('  Row 1:', data[1]);
    if (data.length > 2) console.log('  Row 2:', data[2]);
  }
}
