-- Schema do banco de dados do TCC "Notice." (SQLite)
-- Tabela única de usuários, login feito por RM (não email)

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rm TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    email TEXT,                        -- usado para envio de e-mail de boas-vindas
    senha TEXT NOT NULL,               -- armazenar sempre com hash (ver auth.js)
    tipo TEXT NOT NULL CHECK (tipo IN ('comum', 'professor', 'coordenacao', 'administrador', 'super_admin')),
    telefone TEXT,                     -- opcional, para alunos, professores e coordenação
    foto_url TEXT,                     -- foto de perfil (/uploads/...), opcional
    criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS publicacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id),
    autor_id INTEGER REFERENCES usuarios(id),
    imagem_url TEXT,                   -- caminho da imagem enviada (ex: /uploads/arquivo.jpg)
    data_evento TEXT,                  -- usado por publicações da categoria "Anexos" (calendário)
    publico INTEGER NOT NULL DEFAULT 0, -- 1 = evento divulgado na agenda pública da página inicial
    criado_em TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS acessos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  evento TEXT NOT NULL,        -- 'login', 'ver_home', 'ver_categoria'
  referencia TEXT,             -- slug da categoria
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_acessos_usuario ON acessos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_acessos_data ON acessos(criado_em);

 -- marcar publicações como lidas para não mostrar mais na home
CREATE TABLE IF NOT EXISTS leituras (
  usuario_id    INTEGER NOT NULL,
  publicacao_id INTEGER NOT NULL,
  lida_em       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (usuario_id, publicacao_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE
);
-- currículos enviados pelos alunos nas vagas de emprego (um por aluno em cada vaga).
-- O PDF fica em backend/curriculos/ (pasta privada, nunca servida como arquivo público).
CREATE TABLE IF NOT EXISTS curriculos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  publicacao_id INTEGER NOT NULL,
  usuario_id    INTEGER NOT NULL,
  arquivo       TEXT NOT NULL,          -- nome do arquivo salvo (aleatório)
  nome_original TEXT NOT NULL,          -- nome do arquivo no computador do aluno
  tamanho       INTEGER NOT NULL,       -- bytes
  mensagem      TEXT,                   -- recado opcional do aluno
  enviado_em    TEXT NOT NULL DEFAULT (datetime('now')),
  visto_em      TEXT,                   -- primeira vez que um administrador abriu
  UNIQUE (publicacao_id, usuario_id),
  FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_curriculos_publicacao ON curriculos(publicacao_id);

-- cada vez que alguém abre um aviso (pop-up da publicação). Alimenta o relatório.
-- Sem chave estrangeira de propósito: guarda título e categoria do aviso no momento,
-- para o histórico continuar valendo depois que o aviso sai do sistema (limpeza de 30 dias).
CREATE TABLE IF NOT EXISTS visualizacoes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  publicacao_id INTEGER NOT NULL,
  titulo        TEXT NOT NULL,
  categoria     TEXT,
  usuario_id    INTEGER,               -- vira NULL se a conta for excluída
  tipo_usuario  TEXT,
  visto_em      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visualizacoes_data ON visualizacoes(visto_em);
CREATE INDEX IF NOT EXISTS idx_visualizacoes_pub ON visualizacoes(publicacao_id);
CREATE INDEX IF NOT EXISTS idx_visualizacoes_usuario ON visualizacoes(usuario_id, publicacao_id, visto_em);

-- primeira vez: quem já marcou um aviso como lido, viu o aviso. Aproveita esse histórico.
INSERT INTO visualizacoes (publicacao_id, titulo, categoria, usuario_id, tipo_usuario, visto_em)
SELECT p.id, p.titulo, c.nome, u.id, u.tipo, l.lida_em
FROM leituras l
JOIN publicacoes p ON p.id = l.publicacao_id
LEFT JOIN categorias c ON c.id = p.categoria_id
JOIN usuarios u ON u.id = l.usuario_id
WHERE NOT EXISTS (SELECT 1 FROM visualizacoes);
