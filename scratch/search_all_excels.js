const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      try { searchDir(fullPath); } catch (e) {}
    } else if (entry.name.endsWith('.xlsx') || entry.name.endsWith('.xls')) {
      try {
        const wb = xlsx.readFile(fullPath);
        for (const sheetName of wb.SheetNames) {
          if (sheetName.toLowerCase().includes('match') || sheetName.toLowerCase().includes('copa') || sheetName.toLowerCase().includes('play')) {
            console.log(`FOUND SHEET: ${sheetName} in ${fullPath}`);
          }
          const sheet = wb.Sheets[sheetName];
          const text = JSON.stringify(xlsx.utils.sheet_to_json(sheet));
          if (text.toLowerCase().includes('semifinal') || text.toLowerCase().includes('match play') || text.toLowerCase().includes('cuartos')) {
            console.log(`FOUND CONTENT (match/semi) in sheet ${sheetName} of ${fullPath}`);
          }
        }
      } catch (err) {}
    }
  }
}

searchDir('C:\\Users\\pjuan\\OneDrive\\Areas\\Footgolf Catalunya');
