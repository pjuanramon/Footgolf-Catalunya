const fs = require('fs');
const XLSX = require('xlsx');

const imagePlayers = [
    "Jorge Santiago Buqueras", "Daniel Abril Amador", "V. Alvarez", "Eduardo martin rodriguez",
    "Santiago Jimenez Ortiz", "Mario Morón Sancho", "Jordi Martin Garcia", "Ivan luengo robles",
    "Alberto Leiva cañada", "Xavi Leiva Cañada", "Sergi Pahisa", "Chema Martínez Guillamon",
    "J.Montesinos", "Gustavo Verse", "Alberto Salazar Fernández", "Gastón Masuck Cardozo",
    "David Rojo Dengra", "Jordi Ortega López", "Erik Matarrubia Galera", "Jesús Pizarro Gonzálvez",
    "JuanRa Perez"
];

function normalize(str) {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const normImage = imagePlayers.map(normalize);

const files = [
    'c:\\Dev\\Footgolf_Cat_Web\\Hits_Footgolf_2026-07-18_Formatted.xlsx',
    'c:\\Dev\\Footgolf_Cat_Web\\Hits_Footgolf_2026-07-18.xlsx',
    'c:\\Dev\\Footgolf_Cat_Web\\Hits_Footgolf_2026-07-04.xlsx',
    'c:\\Dev\\Footgolf_Cat_Web\\Resultados_Torneos\\Tournament Report from Etapas 7-12 Footgolf Catalunya generated -2026-07-20 10_21_22.xlsx',
    'c:\\Dev\\Footgolf_Cat_Web\\tmp_ranking.json',
    'c:\\Dev\\Footgolf_Cat_Web\\tmp_ranking_v2.json',
    'c:\\Dev\\Footgolf_Cat_Web\\dist\\docs\\clasificacion_jornada_3.json'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = '';
        try {
            if (file.endsWith('.xlsx')) {
                const workbook = XLSX.readFile(file);
                content = JSON.stringify(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]));
            } else {
                content = fs.readFileSync(file, 'utf8');
            }
            const normContent = normalize(content);
            
            let found = [];
            let missing = [];
            for (let i=0; i<imagePlayers.length; i++) {
                // simple search
                let n1 = normImage[i];
                // sometimes names are short, let's try just searching the last name
                if (normContent.includes(n1)) {
                    found.push(imagePlayers[i]);
                } else {
                    missing.push(imagePlayers[i]);
                }
            }
            if (found.length > 5) {
                console.log(`\n--- ${file} ---`);
                console.log(`Found ${found.length} / 21 players.`);
                console.log(`Missing: ${missing.join(', ')}`);
            }
        } catch(e) {}
    }
});
