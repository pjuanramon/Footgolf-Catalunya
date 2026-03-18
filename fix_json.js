const fs = require('fs');

const jsonPath = 'public/docs/clasificacion_jornada_3.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Historical data extracted from process_jornada.html
const hist = {
    masculino: [
        { name: "Sergi Perez Vilar", e1: 160, e2: 0 },
        { name: "Nicola Perra", e1: 145, e2: 0 },
        { name: "Gastón Masuck Cardozo", e1: 125, e2: 0 }
    ],
    rookie: [
        { name: "Gastón Masuck Cardozo", e1: 185, e2: 0 }
    ],
    senior45: [],
    senior55: []
};

// Add missing players to Absoluta
hist.masculino.forEach(hp => {
    let players = data.categorias.Absoluta;
    if (!players.find(p => p.name.toLowerCase().includes(hp.name.toLowerCase()) || hp.name.toLowerCase().includes(p.name.toLowerCase()))) {
        players.push({
            pos: 0,
            name: hp.name,
            e1: hp.e1,
            e2: hp.e2,
            e3: 0,
            total: hp.e1 + hp.e2,
            isUnlicensed: false
        });
    }
});

// Add missing players to Rookie
hist.rookie.forEach(hp => {
    let players = data.categorias.Rookie;
    if (!players.find(p => p.name.toLowerCase().includes(hp.name.toLowerCase()) || hp.name.toLowerCase().includes(p.name.toLowerCase()))) {
        players.push({
            pos: 0,
            name: hp.name,
            e1: hp.e1,
            e2: hp.e2,
            e3: 0,
            total: hp.e1 + hp.e2,
            isUnlicensed: false
        });
    }
});

// Sort and re-index positions for all categories
for (const cat in data.categorias) {
    data.categorias[cat].sort((a, b) => b.total - a.total);
    data.categorias[cat].forEach((p, idx) => {
        p.pos = idx + 1;
    });
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4));
console.log('JSON updated successfully');
