const https = require('https');
const fs = require('fs');

const postData = JSON.stringify({
  pageId: "2c6d93f8-2222-803c-9f48-df8dcee947b2",
  limit: 200,
  cursor: { stack: [] },
  chunkNumber: 0,
  verticalColumns: false
});

const options = {
  hostname: 'www.notion.so',
  port: 443,
  path: '/api/v3/loadPageChunk',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('C:\\Dev\\Footgolf_Cat_Web\\scratch\\notion_dump.json', data);
    console.log('Saved notion_dump.json, size:', data.length);
    const json = JSON.parse(data);
    const recordMap = json.recordMap;
    for (const [id, blockObj] of Object.entries(recordMap.block || {})) {
      const val = blockObj.value;
      if (val) {
        console.log(`Type: ${val.type}, id: ${id}`);
        if (val.properties) {
          console.log(`  properties:`, JSON.stringify(val.properties));
        }
      }
    }
  });
});

req.write(postData);
req.end();
