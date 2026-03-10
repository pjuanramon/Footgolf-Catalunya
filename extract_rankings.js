const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('public', 'docs', 'Ranking Catalán 2026.xlsx');
const workbook = XLSX.readFile(filePath);

const sheets = ['Ranking Masculino', 'Ranking Rookie', 'Ranking Senior'];
const result = {};

sheets.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    if (sheet) {
        // Find the range of the table. Assuming it starts at A1 or similar.
        // We'll convert to JSON and take the first few columns/rows that contain data.
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // We probably only need the first few columns (Pos, Name, Points, etc.)
        // Let's filter out empty rows and format it simply.
        const cleanedData = data.filter(row => row.length > 0 && row[1]) // Row[1] is usually the name
            .slice(0, 11); // Take Top 10 + Header

        result[sheetName] = cleanedData;
    }
});

console.log(JSON.stringify(result, null, 2));
