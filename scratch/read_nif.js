const fs = require("fs");
const pdf = fs.readFileSync("TARJETA NIF.pdf");
const latin = pdf.toString("latin1");

const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
let match;
let count = 0;
const zlib = require("zlib");

// Let's decode hex strings like <4153534F4349414349D320464F4F54474F4C4620434154414C554E5941> to readable text
function decodeHex(hexStr) {
    return hexStr.replace(/<([A-Fa-f0-9]+)>/g, (m, hex) => {
        return Buffer.from(hex, "hex").toString("latin1");
    });
}

console.log("=== Decompressing and printing decoded hex text in streams ===");
while ((match = streamRegex.exec(latin)) !== null) {
    count++;
    const streamData = Buffer.from(match[1], "binary");
    try {
        const decompressed = zlib.inflateSync(streamData);
        const text = decompressed.toString("latin1");
        if (text.toUpperCase().includes("LETAMENDI") || text.toUpperCase().includes("ASSOCIACI")) {
            console.log(`--- Stream ${count} ---`);
            const decoded = decodeHex(text);
            console.log(decoded.replace(/[^\x20-\x7E\n]/g, " "));
        }
    } catch (e) {
        // failed decompression
    }
}