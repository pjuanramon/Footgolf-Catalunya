const https = require('https');

const postData = JSON.stringify({
  pageId: "2c6d93f8-2222-803c-9f48-df8dcee947b2",
  limit: 100,
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
    try {
      const json = JSON.parse(data);
      console.log('Got response from Notion!');
      const recordMap = json.recordMap;
      if (recordMap && recordMap.block) {
        console.log('Total blocks:', Object.keys(recordMap.block).length);
        for (const [id, blockObj] of Object.entries(recordMap.block)) {
          const val = blockObj.value;
          if (val && val.properties && val.properties.title) {
            console.log(`[${val.type}] ${JSON.stringify(val.properties.title)}`);
          }
        }
      } else {
        console.log('No blocks in recordMap. Keys:', Object.keys(json));
      }
    } catch (e) {
      console.error('Parse error:', e.message, data.substring(0, 300));
    }
  });
});

req.on('error', (e) => {
  console.error('Req error:', e);
});

req.write(postData);
req.end();
