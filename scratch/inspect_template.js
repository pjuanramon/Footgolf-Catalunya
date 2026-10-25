const XLSX = require('xlsx');
const workbook = XLSX.readFile('c:\\Dev\\Footgolf_Cat_Web\\Excel_ImportHitsTournamentRound983_Export-2026-04-02 09_41_53.xlsx');

console.log('Template Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(name => {
    console.log(`\n--- ${name} ---`);
    const sheet = workbook.Sheets[name];
    console.log(XLSX.utils.sheet_to_json(sheet, {header: 1})[0]);
});
