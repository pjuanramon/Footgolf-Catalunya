const fs = require('fs');
const unzipper = require('zlib');
const child_process = require('child_process');

// We can use powershell Expand-Archive or tar or 7z or python or AdmZip
// Let's test with powershell Expand-Archive into a temp directory or scratch
const outDir1 = 'C:\\Dev\\Footgolf_Cat_Web\\scratch\\wa_cat';
const outDir2 = 'C:\\Dev\\Footgolf_Cat_Web\\scratch\\wa_players';

if (!fs.existsSync(outDir1)) fs.mkdirSync(outDir1, { recursive: true });
if (!fs.existsSync(outDir2)) fs.mkdirSync(outDir2, { recursive: true });

console.log('Extracting zip files...');
try {
  child_process.execSync(`tar -xf "C:\\Users\\pjuan\\OneDrive\\Areas\\Footgolf Catalunya\\WhatsApp Chat - Footgolf Catalunya.zip" -C "${outDir1}"`);
  console.log('Extracted wa_cat');
} catch (e) {
  console.error('Error extracting 1:', e.message);
}

try {
  child_process.execSync(`tar -xf "C:\\Users\\pjuan\\OneDrive\\Areas\\Footgolf Catalunya\\WhatsApp Chat - Footgolfers Catalanes.zip" -C "${outDir2}"`);
  console.log('Extracted wa_players');
} catch (e) {
  console.error('Error extracting 2:', e.message);
}
