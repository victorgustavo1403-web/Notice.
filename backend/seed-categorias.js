const { db } = require('./db');

// Corrige as categorias erradas que já existem, sem apagar
// (evita o erro de FOREIGN KEY com publicações já cadastradas)
db.prepare("UPDATE categorias SET nome = 'Geral' WHERE nome = 'Avisos'").run();
db.prepare("UPDATE categorias SET nome = 'Vagas de Emprego' WHERE nome = 'Notícias'").run();
// 'Eventos' já está correta, não precisa mexer

// Insere as categorias que ainda não existem
const faltantes = ['Coordenação', 'Secretaria', 'Anexos'];

const jaExiste = db.prepare('SELECT 1 FROM categorias WHERE nome = ?');
const insert = db.prepare('INSERT INTO categorias (nome) VALUES (?)');

for (const nome of faltantes) {
    if (!jaExiste.get(nome)) {
        insert.run(nome);
    }
}

console.log('Categorias corrigidas com sucesso!');