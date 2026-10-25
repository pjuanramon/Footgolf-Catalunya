const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\pjuan\\.gemini\\antigravity\\brain';
const dirs = fs.readdirSync(brainDir);

const terms = ['match play', 'semifinal', 'palmarés', 'palmares', 'copa catalana'];

for (const d of dirs) {
  const tPath = path.join(brainDir, d, '.system_generated', 'logs', 'transcript.jsonl');
  if (fs.existsSync(tPath)) {
    try {
      const content = fs.readFileSync(tPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const lower = line.toLowerCase();
        if ((lower.includes('match play') || lower.includes('copa')) && lower.includes('2025') && (lower.includes('semifinal') || lower.includes('final') || lower.includes('jorge'))) {
          try {
            const parsed = JSON.parse(line);
            console.log(`[${d}] (${parsed.type || parsed.source}): ${parsed.content ? parsed.content.substring(0, 300) : ''}`);
          } catch(e) {
            console.log(`[${d}] MATCH: ${line.substring(0, 200)}`);
          }
        }
      }
    } catch (err) {
      // ignore
    }
  }
}
