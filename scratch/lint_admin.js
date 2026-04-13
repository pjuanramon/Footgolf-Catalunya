const fs = require('fs');
const content = fs.readFileSync('src/pages/admin.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
    const script = scriptMatch[1];
    try {
        new Function(script);
        console.log('Script is valid JS.');
    } catch (e) {
        console.log('Script is INVALID JS:');
        console.log(e.message);
        // Find line number
        const lines = script.split('\n');
        // This won't give the exact line easily but it confirms the error.
    }
} else {
    console.log('No script found.');
}
