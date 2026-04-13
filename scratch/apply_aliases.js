
const XLSX = require('xlsx');

const mapping = {
    "Mario Morón Sancho": "M. Morón",
    "Jesús Pizarro Gonzálvez": "J. Pizarro",
    "Giacomo Bonacini": "G. Bonacini",
    "Juan Ramón Pérez González": "J. Perez",
    "JuanRa Perez": "J. Perez",
    "Chema Martínez Guillamon": "C. Martínez2114",
    "Eduardo Martin Rodriguez": "E. MartinRdz",
    "Jordi Martin Garcia": "J. Martín3955",
    "Alberto Leiva cañada": "A. Leiva",
    "Alberto Leiva cañada ": "A. Leiva",
    "Alberto Leiva": "A. Leiva",
    "Alex Rodríguez": "A. Rodriguez",
    "Alberto Salazar Fernández": "A. Salazar",
    "Daniel Abril Amador": "D. Abril",
    "David Linares Ramos": "D. Linares",
    "David Tellez Viana": "D. Tellez",
    "Erik Matarrubia Galera": "E. Matarrubia",
    "Gastón Masuck Cardozo": "G. Masuck",
    "Gustavo Alejandro Verse": "G. Verse",
    "Gustavo Verse": "G. Verse",
    "Ivan luengo robles": "I. Luengo",
    "Luengo": "I. Luengo",
    "javi manchon": "J. Manchon",
    "Jordi Ortega López": "J. Ortega",
    "Jorge Santiago Buqueras": "J. Santiago",
    "Joan Torre Rodríguez": "J. Torre",
    "J. Wermer": "J. Wermer",
    "Marc Company Salvat": "M. Company",
    "Olivier Tressens": "O. Tressens",
    "Santiago Jimenez Ortiz": "S. Jimenez",
    "Sergi Pahisa Garcia": "S. Pahisa",
    "Sergi Pahisa": "S. Pahisa",
    "Sergi Perez Vilar": "S. Perez",
    "Xavi Leiva Cañada": "X. Leiva"
};

const workbook = XLSX.readFile('Hits_Footgolf_2026-04-12.xlsx');
const sheetName = 'FOOTGOLFERS';
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const aliasedData = data.map(row => {
    const originalName = row['Footgolfer'] ? row['Footgolfer'].trim() : '';
    if (mapping[originalName]) {
        row['Footgolfer'] = mapping[originalName];
    } else {
        // Soft matching for common variations
        for (let key in mapping) {
            if (originalName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(originalName.toLowerCase())) {
                row['Footgolfer'] = mapping[key];
                break;
            }
        }
    }
    return row;
});

const newWorksheet = XLSX.utils.json_to_sheet(aliasedData);
workbook.Sheets[sheetName] = newWorksheet;

XLSX.writeFile(workbook, 'Hits_Footgolf_2026-04-12_Aliased.xlsx');
console.log('Archivo generado: Hits_Footgolf_2026-04-12_Aliased.xlsx');
