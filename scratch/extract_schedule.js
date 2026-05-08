const fs = require('fs');
const path = 'C:\\Users\\pjuan\\.gemini\\antigravity\\brain\\52f32392-320a-4a66-a33b-9fd0d28490d9\\.system_generated\\logs\\overview.txt';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
const lastModelLine = lines.findLast(l => l.includes('"type":"PLANNER_RESPONSE"'));
if (lastModelLine) {
    const data = JSON.parse(lastModelLine);
    fs.writeFileSync('scratch/full_schedule.md', data.content);
    console.log("Schedule written to scratch/full_schedule.md");
} else {
    console.log("No model response found");
}
