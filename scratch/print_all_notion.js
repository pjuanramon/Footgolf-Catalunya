const fs = require('fs');
const raw = fs.readFileSync('C:\\Dev\\Footgolf_Cat_Web\\scratch\\notion_dump.json', 'utf8');
const data = JSON.parse(raw);
for (const [id, item] of Object.entries(data.recordMap.block)) {
  const b = item.value?.value || item.value;
  if (!b) continue;
  if (b.properties && b.properties.title) {
    const t = b.properties.title.map(c => c[0]).join('');
    console.log(`[${b.type}] ${t}`);
  }
}
