const { db } = require('./db');

db.exec("ALTER TABLE usuarios ADD COLUMN email TEXT");

console.log('Coluna email adicionada com sucesso!');