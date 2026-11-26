const { db } = require('./db');

db.prepare(`ALTER TABLE publicacoes ADD COLUMN imagem_url TEXT`).run();

console.log('Coluna imagem_url adicionada com sucesso!');