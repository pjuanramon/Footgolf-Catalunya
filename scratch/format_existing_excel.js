const XLSX = require('xlsx');
const fs = require('fs');

function formatFootgolferName(fullName) {
    if (!fullName) return '';
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    
    // Hardcoded maps/exceptions to ensure 100% correct formatting for existing players
    const manualMap = {
        'Eduardo Martin Rodriguez': 'E. Martin',
        'Jordi Martin Garcia': 'J. Martín',
        'Chema Martínez Guillamon': 'C. Martínez',
        'Juan Rodriguez Curbelo': 'J. Rodríguez',
        'Juan Ramón Pérez González': 'J. Pérez',
        'Gustavo Alejandro Verse': 'G. Verse',
        'Marc Arrebola Sans': 'M. Arrebola',
        'Joan Montesinos Vega': 'J. Montesinos',
        'Victor Alvarez Moreno': 'V. Álvarez',
        'David Rojo Demgra': 'D. Rojo',
        'David Rojo Dengra': 'D. Rojo',
        'Ivan luengo robles': 'I. Luengo',
        'Ivan Luengo Robles': 'I. Luengo'
    };
    
    if (manualMap[cleanName]) {
        return manualMap[cleanName];
    }
    
    // Fallback automatic formatting
    const parts = cleanName.split(' ');
    if (parts.length <= 1) return cleanName;
    
    const initial = parts[0][0].toUpperCase();
    
    // Check if the second word is a known middle name/second first name to skip to the third word for the surname
    const secondWordsToSkip = ['ramon', 'ramón', 'alejandro', 'manuel', 'jose', 'josé', 'maria', 'maría', 'carlos', 'javier', 'miguel', 'antonio', 'angel', 'ángel'];
    let surnameIndex = 1;
    if (parts.length > 2 && secondWordsToSkip.includes(parts[1].toLowerCase())) {
        surnameIndex = 2;
    }
    
    let surname = parts[surnameIndex];
    if (surname) {
        surname = surname.charAt(0).toUpperCase() + surname.slice(1);
    }
    
    return `${initial}. ${surname}`;
}

const workbook = XLSX.readFile('Hits_Footgolf_2026-07-18.xlsx');

// Transform the FOOTGOLFERS sheet
const footgolfersSheet = workbook.Sheets['FOOTGOLFERS'];
const footgolfersData = XLSX.utils.sheet_to_json(footgolfersSheet);

const updatedFootgolfers = footgolfersData.map(row => {
    const originalName = row['Footgolfer'];
    const formatted = formatFootgolferName(originalName);
    return {
        ...row,
        'Footgolfer': formatted
    };
});

// Replace the sheet with updated data
const newFootgolfersSheet = XLSX.utils.json_to_sheet(updatedFootgolfers);
workbook.Sheets['FOOTGOLFERS'] = newFootgolfersSheet;

try {
    XLSX.writeFile(workbook, 'Hits_Footgolf_2026-07-18.xlsx');
    console.log('SUCCESS_OVERWRITE');
} catch (err) {
    if (err.code === 'EBUSY') {
        XLSX.writeFile(workbook, 'Hits_Footgolf_2026-07-18_Formatted.xlsx');
        console.log('SUCCESS_FORMATTED_NEW_FILE');
    } else {
        throw err;
    }
}
