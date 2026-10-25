const XLSX = require('xlsx');
const fs = require('fs');

const files = [
    'c:\\Dev\\Footgolf_Cat_Web\\Hits_Footgolf_2026-07-18_Formatted.xlsx',
    'c:\\Dev\\Footgolf_Cat_Web\\Hits_Footgolf_2026-07-18.xlsx',
    'c:\\Dev\\Footgolf_Cat_Web\\Hits_Footgolf_2026-07-04.xlsx',
    'c:\\Dev\\Footgolf_Cat_Web\\Resultados_Torneos\\Tournament Report from Etapas 7-12 Footgolf Catalunya generated -2026-07-20 10_21_22.xlsx'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            console.log(`\n--- Reading ${file} ---`);
            const workbook = XLSX.readFile(file);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet);
            
            // Try to find columns related to name or player
            let nameCol = null;
            if (json.length > 0) {
                const keys = Object.keys(json[0]);
                nameCol = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('nombre') || k.toLowerCase().includes('jugador') || k.toLowerCase().includes('player') || k.toLowerCase().includes('nickname'));
                
                if (nameCol) {
                    const names = json.map(row => row[nameCol]).filter(n => n);
                    console.log(`Found ${names.length} players using column '${nameCol}'`);
                    console.log(names);
                } else {
                    console.log('Could not find name column. Columns are:', keys);
                }
            }
        } catch (e) {
            console.log(`Error reading ${file}: ${e.message}`);
        }
    } else {
        console.log(`${file} does not exist.`);
    }
});
