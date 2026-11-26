// Popula o banco com os usuários de teste definidos pelo grupo.
// Rode com: node seed.js

const bcrypt = require('bcryptjs');
const { db } = require('./db');

const usuariosTeste = [
    // usuários comuns (com telefone)
    { rm: '10001', nome: 'Vinicius', senha: 'senha123', tipo: 'comum', telefone: '11999990001' },
    { rm: '10002', nome: 'José',     senha: 'senha123', tipo: 'comum', telefone: '11999990002' },
    { rm: '10003', nome: 'Victor',   senha: 'senha123', tipo: 'comum', telefone: '11999990003' },
    { rm: '10004', nome: 'Pedro',    senha: 'senha123', tipo: 'comum', telefone: '11999990004' },
    // administradores (publicam e administram as funcionalidades)
    { rm: '20001', nome: 'Renato', senha: 'senha123', tipo: 'administrador', telefone: null },
    { rm: '20002', nome: 'Raquel', senha: 'senha123', tipo: 'administrador', telefone: null },
    // super admin (controla os outros usuários)
    { rm: '30001', nome: 'Selma', senha: 'senha123', tipo: 'super_admin', telefone: null },
];

const insert = db.prepare(`
    INSERT OR IGNORE INTO usuarios (rm, nome, senha, tipo, telefone)
    VALUES (@rm, @nome, @senha, @tipo, @telefone)
`);

for (const usuario of usuariosTeste) {
    const senhaHash = bcrypt.hashSync(usuario.senha, 10);
    insert.run({ ...usuario, senha: senhaHash });
}

console.log('Usuários de teste inseridos (ou já existentes).');