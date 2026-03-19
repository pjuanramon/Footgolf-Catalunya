const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file.replace(__dirname + path.sep, ''));
        }
    });
    return results;
}

try {
    const files = walk('dist');
    files.forEach(f => console.log(f));
} catch (e) {
    console.log('Error:', e.message);
}
