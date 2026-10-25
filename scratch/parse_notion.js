const fs = require('fs');

const raw = fs.readFileSync('C:\\Dev\\Footgolf_Cat_Web\\scratch\\notion_dump.json', 'utf8');
const data = JSON.parse(raw);

const blocks = data.recordMap.block;

for (const [id, item] of Object.entries(blocks)) {
  const v = item.value?.value || item.value;
  if (!v) continue;
  let text = '';
  if (v.properties) {
    for (const [propName, propVal] of Object.entries(v.properties)) {
      if (Array.isArray(propVal)) {
        const str = propVal.map(chunk => chunk[0]).join('');
        text += `[${propName}: ${str}] `;
      }
    }
  }
  console.log(`Block (${v.type}, id: ${v.id}): ${text}`);
}
