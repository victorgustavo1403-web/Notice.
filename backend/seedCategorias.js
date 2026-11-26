// Popula a tabela de categorias com os nomes usados no navbar.
// Rode com: node seed-categorias.js

const { db } = require('./db');

const categorias = ['Geral', 'Eventos', 'Vagas de emprego', 'Coordenação', 'Secretaria', 'Anexos'];

const insert = db.prepare(`INSERT OR IGNORE INTO categorias (nome) VALUES (?)`);

for (const nome of categorias) {
    insert.run(nome);
}

console.log('Categorias inseridas (ou já existentes).');