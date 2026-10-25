const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\pjuan\\.gemini\\antigravity\\brain';
const outputFile = path.join(__dirname, 'search_results.txt');

function searchTranscripts() {
    console.log('Searching all transcripts for "Luca Rubinacci" or "Rubinacci"...');
    
    if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
    }
    
    if (!fs.existsSync(brainDir)) {
        console.error('Brain directory does not exist.');
        return;
    }

    const folders = fs.readdirSync(brainDir);
    let matchCount = 0;

    folders.forEach(folder => {
        const folderPath = path.join(brainDir, folder);
        if (!fs.statSync(folderPath).isDirectory()) return;

        // Try to find transcript.jsonl under .system_generated/logs
        const transcriptPath = path.join(folderPath, '.system_generated', 'logs', 'transcript.jsonl');
        
        if (fs.existsSync(transcriptPath)) {
            const content = fs.readFileSync(transcriptPath, 'utf8');
            if (content.toLowerCase().includes('rubinacci')) {
                fs.appendFileSync(outputFile, `\n========================================\nMatch found in conversation: ${folder}\n========================================\n`);
                
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (line.toLowerCase().includes('rubinacci')) {
                        try {
                            const parsed = JSON.parse(line);
                            fs.appendFileSync(outputFile, `Step: ${parsed.step_index} | Source: ${parsed.source} | Type: ${parsed.type}\n`);
                            fs.appendFileSync(outputFile, `Content:\n${parsed.content}\n`);
                            fs.appendFileSync(outputFile, '----------------------------------------\n');
                        } catch (e) {
                            fs.appendFileSync(outputFile, `Raw Line:\n${line}\n`);
                            fs.appendFileSync(outputFile, '----------------------------------------\n');
                        }
                    }
                });
                matchCount++;
            }
        }
    });

    console.log(`\nSearch complete. Found matches in ${matchCount} conversations. Results written to ${outputFile}`);
}

searchTranscripts();
