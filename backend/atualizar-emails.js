const { db } = require('./db');

const emails = [
  { rm: '10001', email: 'vinicius@notice.local' },
  { rm: '10002', email: 'jose@notice.local' },
  { rm: '10003', email: 'victor@notice.local' },
  { rm: '10004', email: 'pedro@notice.local' },
  { rm: '20001', email: 'renato@notice.local' },
  { rm: '20002', email: 'raquel@notice.local' },
  { rm: '30001', email: 'selma@notice.local' },
];

const atualizar = db.prepare('UPDATE usuarios SET email = ? WHERE rm = ?');

for (const { rm, email } of emails) {
  atualizar.run(email, rm);
}

console.log('E-mails atualizados com sucesso!');