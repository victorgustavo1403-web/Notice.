const { db } = require('./db');

const usuario = db.prepare('SELECT rm, senha, tipo FROM usuarios WHERE rm = ?').get('10001');
console.log(usuario);