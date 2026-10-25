const fs = require('fs');

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
    const bodyMatch = html.match(/<body[^>]*>/i);
    const styleMatch = html.match(/body\s*\{([^}]*)\}/i);
    console.log(`Page: ${p}`);
    console.log(`  <body tag>: ${bodyMatch ? bodyMatch[0] : 'None'}`);
    console.log(`  body css: ${styleMatch ? styleMatch[1].trim() : 'None in <style>'}`);
}
