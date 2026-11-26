const { db } = require('./db');

db.prepare(`ALTER TABLE publicacoes ADD COLUMN data_evento TEXT`).run();

console.log('Coluna data_evento adicionada com sucesso!');