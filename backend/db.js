// Conexão com o banco SQLite.
// Instale as dependências antes de usar:
//   npm install better-sqlite3 bcryptjs

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'notice.db');
const db = new Database(DB_PATH);

// Aplica o schema.sql automaticamente na primeira execução
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// ---------- MIGRAÇÃO: tipos de usuário "professor" e "coordenacao" ----------
// O SQLite não altera um CHECK existente, então a tabela é recriada.
// Roda uma única vez (só se o CHECK ainda não aceitar 'coordenacao') e,
// antes de mexer, guarda uma cópia do banco ao lado do notice.db.
function migrarTipoProfessor() {
    const linha = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'usuarios'").get();
    if (!linha || linha.sql.includes("'coordenacao'")) return;

    const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = path.join(__dirname, `notice.backup-antes-coordenacao-${carimbo}.db`);
    db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(DB_PATH, backup);
    console.log(`[migração] cópia de segurança criada: ${path.basename(backup)}`);

    const colunasAntigas = db.prepare('PRAGMA table_info(usuarios)').all().map((c) => c.name);
    const colunasNovas = ['id', 'rm', 'nome', 'email', 'senha', 'tipo', 'telefone', 'foto_url', 'criado_em'];
    const comuns = colunasNovas.filter((c) => colunasAntigas.includes(c)).join(', ');

    db.pragma('foreign_keys = OFF');
    try {
        db.transaction(() => {
            db.exec(`
                CREATE TABLE usuarios_novo (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    rm TEXT NOT NULL UNIQUE,
                    nome TEXT NOT NULL,
                    email TEXT,
                    senha TEXT NOT NULL,
                    tipo TEXT NOT NULL CHECK (tipo IN ('comum', 'professor', 'coordenacao', 'administrador', 'super_admin')),
                    telefone TEXT,
                    foto_url TEXT,
                    criado_em TEXT DEFAULT (datetime('now'))
                );
                INSERT INTO usuarios_novo (${comuns}) SELECT ${comuns} FROM usuarios;
                DROP TABLE usuarios;
                ALTER TABLE usuarios_novo RENAME TO usuarios;
            `);
        })();
    } finally {
        db.pragma('foreign_keys = ON');
    }
    console.log('[migração] tipos "professor" e "coordenacao" habilitados na tabela de usuários.');
}

migrarTipoProfessor();

// ---------- MIGRAÇÃO: foto de perfil ----------
if (!db.prepare('PRAGMA table_info(usuarios)').all().some((c) => c.name === 'foto_url')) {
    db.exec('ALTER TABLE usuarios ADD COLUMN foto_url TEXT');
    console.log('[migração] coluna "foto_url" adicionada em usuarios.');
}

// ---------- MIGRAÇÃO: eventos públicos ----------
// Coluna "publico" (0/1): o administrador escolhe quais eventos aparecem na página inicial,
// visível para quem não tem login. Bancos antigos recebem a coluna uma única vez.
const colunasPublicacoes = db.prepare('PRAGMA table_info(publicacoes)').all().map((c) => c.name);
if (!colunasPublicacoes.includes('publico')) {
    db.exec('ALTER TABLE publicacoes ADD COLUMN publico INTEGER NOT NULL DEFAULT 0');
    console.log('[migração] coluna "publico" criada em publicacoes.');
}

// Categorias das áreas restritas (criadas uma vez; ignoradas se já existirem)
const inserirCategoria = db.prepare('INSERT OR IGNORE INTO categorias (nome) VALUES (?)');
inserirCategoria.run('Área do professor');
inserirCategoria.run('Área dos funcionários');

module.exports = { db };
