const fs = require('fs');

const raw = fs.readFileSync('src/data/players.json', 'utf8');
const players = JSON.parse(raw);

const queries = ['Luengo', 'Leiva', 'Pahisa', 'JuanRa', 'Jordi', 'Abril', 'Santiago', 'Medina', 'Gustavo', 'Tellez', 'Pizarro', 'Chechu'];

queries.forEach(q => {
  const matches = players.filter(p => JSON.stringify(p).toLowerCase().includes(q.toLowerCase()));
  console.log(`Query ${q}:`, matches.map(m => ({ id: m.id, name: m.name, nickname: m.nickname })));
});
