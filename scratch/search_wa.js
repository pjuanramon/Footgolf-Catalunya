const fs = require('fs');
const path = require('path');

function searchChat(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f.endsWith('.txt')) {
      const fullPath = path.join(dir, f);
      console.log('Reading:', fullPath);
      const text = fs.readFileSync(fullPath, 'utf8');
      const lines = text.split('\n');
      console.log(`Total lines in ${f}: ${lines.length}`);
      
      lines.forEach((line, idx) => {
        const lower = line.toLowerCase();
        if ((lower.includes('match play') || lower.includes('copa') || lower.includes('semifinal')) && (lower.includes('semi') || lower.includes('final') || lower.includes('cuartos') || lower.includes('vs'))) {
          console.log(`Line ${idx}: ${line.trim()}`);
        }
      });
    }
  }
}

console.log('--- SEARCHING wa_cat ---');
searchChat('C:\\Dev\\Footgolf_Cat_Web\\scratch\\wa_cat');

console.log('--- SEARCHING wa_players ---');
searchChat('C:\\Dev\\Footgolf_Cat_Web\\scratch\\wa_players');
