const fs = require('fs');

async function checkResend() {
    const env = fs.readFileSync('.env', 'utf8');
    let apiKey = '';
    env.split('\n').forEach(line => {
        const idx = line.indexOf('=');
        if (idx > -1 && line.substring(0, idx).trim() === 'RESEND_API_KEY') {
            apiKey = line.substring(idx + 1).trim();
        }
    });

    if (!apiKey) {
        console.log('No Resend API Key');
        return;
    }

    const res = await fetch('https://api.resend.com/emails', {
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });

    const data = await res.json();
    console.log('Resend emails status:', res.status);
    console.log('Resend data:', JSON.stringify(data, null, 2));
}

checkResend().catch(console.error);
