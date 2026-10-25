const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        const lower = line.toLowerCase();
        // check for white background with white text or similar
        if ((lower.includes('background') && (lower.includes('#fff') || lower.includes('white') || lower.includes('255, 255, 255, 0.9') || lower.includes('255,255,255,0.9') || lower.includes('255, 255, 255, 1') || lower.includes('--bg-color'))) &&
            (lower.includes('color') && (lower.includes('#fff') || lower.includes('white') || lower.includes('#f') || lower.includes('--text-inverse')))) {
            console.log(`${filePath}:${idx + 1}: ${line.trim()}`);
        }
    });
}

function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git' && e.name !== 'dist') {
            scanDir(full);
        } else if (e.isFile() && (e.name.endsWith('.html') || e.name.endsWith('.css'))) {
            checkFile(full);
        }
    }
}

console.log('--- SCANNING FILES ---');
scanDir('.');
