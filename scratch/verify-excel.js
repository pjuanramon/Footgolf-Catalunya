const xlsx = require('xlsx');
const path = require('path');

async function main() {
    const excelPath = path.resolve(__dirname, '../Hits_Footgolf_2026-06-13.xlsx');
    console.log('Reading Excel:', excelPath);
    const workbook = xlsx.readFile(excelPath);
    
    const footgolfers = xlsx.utils.sheet_to_json(workbook.Sheets['FOOTGOLFERS']);
    console.log('Total players in Excel:', footgolfers.length);
    
    const groups = {};
    footgolfers.forEach(f => {
        const hit = f['Número de Hit'];
        if (!groups[hit]) groups[hit] = [];
        groups[hit].push(f.Footgolfer);
    });
    
    console.log('--- GENERATED GROUPS ---');
    Object.keys(groups).forEach(hit => {
        console.log(`Hit ${hit}:`, groups[hit]);
    });
}

main().catch(console.error);
