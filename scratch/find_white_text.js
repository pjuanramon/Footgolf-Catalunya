const fs = require('fs');

const files = [
    'src/pages/copa.html',
    'src/pages/clasificaciones.html',
    'src/pages/calendario.html',
    'src/pages/inscripciones.html',
    'src/pages/jugadores.html',
    'src/pages/institucional.html',
    'src/pages/equipos.html',
    'src/pages/circular.html',
    'src/pages/reglas.html',
    'src/pages/palmares.html',
    'index.html',
    'styles/main.css'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (/color:\s*(white|#fff|#ffffff)/i.test(line)) {
            // print context
            console.log(`[${file}:${i+1}] ${line.trim()}`);
        }
    });
}
