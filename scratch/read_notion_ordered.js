const fs = require('fs');
const raw = fs.readFileSync('C:\\Dev\\Footgolf_Cat_Web\\scratch\\notion_dump.json', 'utf8');
const data = JSON.parse(raw);
const pageBlock = data.recordMap.block['2c6d93f8-2222-803c-9f48-df8dcee947b2']?.value?.value || data.recordMap.block['2c6d93f8-2222-803c-9f48-df8dcee947b2']?.value;

function printBlock(id, depth = 0) {
  const b = data.recordMap.block[id]?.value?.value || data.recordMap.block[id]?.value;
  if (!b) return;
  let text = '';
  if (b.properties) {
    text = Object.entries(b.properties).map(([k, v]) => Array.isArray(v) ? v.map(c => c[0]).join('') : JSON.stringify(v)).join(' | ');
  }
  const indent = '  '.repeat(depth);
  console.log(`${indent}[${b.type}] ${text}`);
  if (b.content) {
    b.content.forEach(childId => printBlock(childId, depth + 1));
  }
}

if (pageBlock && pageBlock.content) {
  pageBlock.content.forEach(childId => printBlock(childId, 0));
} else {
  console.log('No content in pageBlock');
}
