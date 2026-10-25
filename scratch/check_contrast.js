const fs = require('fs');
const path = require('path');

// Let's inspect where inline style or CSS has white on white or missing contrast
const pages = [
    'index.html',
    'src/pages/copa.html',
    'src/pages/clasificaciones.html',
    'src/pages/calendario.html',
    'src/pages/inscripciones.html',
    'src/pages/jugadores.html',
    'src/pages/institucional.html',
    'src/pages/equipos.html',
    'src/pages/circular.html',
    'src/pages/reglas.html',
    'src/pages/palmares.html'
];

for (const p of pages) {
    if (!fs.existsSync(p)) continue;
    const html = fs.readFileSync(p, 'utf8');
    
    // Check for inline styles with color: white / #fff / transparent / light on elements
    const matches = html.match(/style="[^"]*"/g) || [];
    for (const m of matches) {
        const lower = m.toLowerCase();
        // check if both color and background are defined in same inline style
        if (lower.includes('color') && lower.includes('background')) {
            const hasWhiteText = lower.includes('color: white') || lower.includes('color: #fff') || lower.includes('color:#fff') || lower.includes('color: #ffffff');
            const hasWhiteBg = lower.includes('background: white') || lower.includes('background: #fff') || lower.includes('background:#fff') || lower.includes('background: #ffffff') || lower.includes('background: rgba(255, 255, 255') || lower.includes('background-color: white') || lower.includes('background-color: #fff');
            if (hasWhiteText && hasWhiteBg) {
                console.log(`[SUSPECT INLINE SAME ATTR] ${p}: ${m}`);
            }
        }
    }
}
