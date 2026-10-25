const xlsx = require('xlsx');

const file = "C:\\Users\\pjuan\\OneDrive\\Areas\\Footgolf Catalunya\\2025\\Ranking Catalán 2025.xlsx";
try {
  const wb = xlsx.readFile(file);
  console.log('Sheets in Ranking Catalán 2025:', wb.SheetNames);
  for (const name of wb.SheetNames) {
    if (name.toLowerCase().includes('copa') || name.toLowerCase().includes('match') || name.toLowerCase().includes('play')) {
      const data = xlsx.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
      console.log(`Sheet: ${name}`);
      console.log(data.slice(0, 30));
    }
  }
} catch (e) {
  console.error(e);
}
