const fs = require('fs');
const path = require('path');

function search(dir, patterns) {
  if (!fs.existsSync(dir)) {
    console.log('Dir not found:', dir);
    return;
  }
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f.endsWith('.txt')) {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        const lower = line.toLowerCase();
        if (patterns.some(p => lower.includes(p))) {
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length - 1, i + 3);
          console.log(`=== Match in ${f}:${i + 1} ===`);
          for (let j = start; j <= end; j++) {
            console.log(`${j === i ? '>> ' : '   '}${lines[j] ? lines[j].trim() : ''}`);
          }
        }
      });
    }
  }
}

console.log('--- Searching for cabeza, bombo, seed, sorteo in wa_cat and wa_players ---');
search('C:\\Dev\\Footgolf_Cat_Web\\scratch\\wa_cat', ['cabeza', 'bombo', 'seed', 'sorteo']);
search('C:\\Dev\\Footgolf_Cat_Web\\scratch\\wa_players', ['cabeza', 'bombo', 'seed', 'sorteo']);
