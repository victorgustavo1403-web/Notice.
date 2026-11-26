// Currículos dos alunos nas vagas de emprego.
//
//   Aluno (comum):
//     POST   /publicacoes/:id/curriculo   envia ou troca o PDF (campo "curriculo", recado opcional "mensagem")
//     DELETE /publicacoes/:id/curriculo   retira a candidatura
//   Administrador e super admin:
//     GET    /curriculos                  lista todos (?vaga=ID filtra por vaga)
//     DELETE /curriculos/:id              descarta um currículo
//   Ambos:
//     GET    /curriculos/:id/arquivo      baixa o PDF (o aluno só o próprio)
//
// Os PDFs ficam em backend/curriculos/, que NÃO é servida como pasta pública: só saem por
// estas rotas, com login. Cada arquivo é conferido (precisa começar com %PDF) e recebe um
// nome aleatório; o nome original fica guardado só para o download.
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { db } = require('./db');
const { normalizar } = require('./acesso');
const { verificarAutenticado } = require('./middlewares/auth');
const { CURRICULOS_DIR } = require('./limpeza');

const TAMANHO_MAX = 5 * 1024 * 1024; // 5 MB
const MENSAGEM_MAX = 500;
const ADMINS = ['administrador', 'super_admin'];

fs.mkdirSync(CURRICULOS_DIR, { recursive: true });

const router = express.Router();

const receberPdf = multer({
    storage: multer.memoryStorage(), // confere o conteúdo antes de gravar no disco
    limits: { fileSize: TAMANHO_MAX, files: 1 },
}).single('curriculo');

const ehVaga = (nomeCategoria) => normalizar(nomeCategoria).startsWith('vagas');
const ehPdf = (buffer) => buffer?.length > 4 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';

function apenasAluno(req, res, next) {
    if (req.usuario?.tipo !== 'comum') {
        return res.status(403).json({ erro: 'Só alunos podem enviar currículo para as vagas.' });
    }
    next();
}

function apenasAdmin(req, res, next) {
    if (!ADMINS.includes(req.usuario?.tipo)) {
        return res.status(403).json({ erro: 'Acesso restrito aos administradores.' });
    }
    next();
}

function vagaPorId(id) {
    return db.prepare(`
        SELECT publicacoes.id, publicacoes.titulo, categorias.nome AS categoria
        FROM publicacoes
        LEFT JOIN categorias ON categorias.id = publicacoes.categoria_id
        WHERE publicacoes.id = ?
    `).get(id);
}

// nome seguro para o arquivo baixado (sem caminhos nem caracteres estranhos).
// O multer entrega o nome lido como latin1; volta para UTF-8 para manter os acentos.
function nomeLimpo(nome) {
    const utf8 = Buffer.from(String(nome || 'curriculo.pdf'), 'latin1').toString('utf8');
    const base = path.basename(utf8.includes('\uFFFD') ? String(nome) : utf8).replace(/[^\p{L}\p{N} ._()-]/gu, '').trim();
    const comExtensao = base.toLowerCase().endsWith('.pdf') ? base : `${base || 'curriculo'}.pdf`;
    return comExtensao.slice(-120);
}

const apagarArquivo = (nome) => {
    try { fs.unlinkSync(path.join(CURRICULOS_DIR, path.basename(nome))); } catch { /* já não existe */ }
};

const meuCurriculo = (publicacaoId, usuarioId) => db.prepare(`
    SELECT id, nome_original, tamanho, mensagem, enviado_em
    FROM curriculos WHERE publicacao_id = ? AND usuario_id = ?
`).get(publicacaoId, usuarioId);

// ---------- ALUNO: enviar ou trocar ----------
router.post('/publicacoes/:id/curriculo', verificarAutenticado, apenasAluno, (req, res) => {
    receberPdf(req, res, (err) => {
        if (err) {
            const msg = err.code === 'LIMIT_FILE_SIZE' ? 'O arquivo passa de 5 MB. Envie um PDF menor.' : 'Não foi possível receber o arquivo.';
            return res.status(400).json({ erro: msg });
        }
        const vaga = vagaPorId(req.params.id);
        if (!vaga) return res.status(404).json({ erro: 'Vaga não encontrada.' });
        if (!ehVaga(vaga.categoria)) return res.status(400).json({ erro: 'Só dá para enviar currículo em vagas de emprego.' });
        if (!req.file) return res.status(400).json({ erro: 'Escolha o arquivo do currículo.' });
        if (!ehPdf(req.file.buffer)) return res.status(400).json({ erro: 'Envie o currículo em PDF.' });

        const mensagem = String(req.body.mensagem ?? '').trim().slice(0, MENSAGEM_MAX) || null;
        const arquivo = `${crypto.randomUUID()}.pdf`;

        try {
            fs.writeFileSync(path.join(CURRICULOS_DIR, arquivo), req.file.buffer, { flag: 'wx' });
            const anterior = db.prepare('SELECT arquivo FROM curriculos WHERE publicacao_id = ? AND usuario_id = ?').get(vaga.id, req.usuario.id);
            db.prepare(`
                INSERT INTO curriculos (publicacao_id, usuario_id, arquivo, nome_original, tamanho, mensagem)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (publicacao_id, usuario_id) DO UPDATE SET
                    arquivo = excluded.arquivo,
                    nome_original = excluded.nome_original,
                    tamanho = excluded.tamanho,
                    mensagem = excluded.mensagem,
                    enviado_em = datetime('now'),
                    visto_em = NULL
            `).run(vaga.id, req.usuario.id, arquivo, nomeLimpo(req.file.originalname), req.file.size, mensagem);
            if (anterior) apagarArquivo(anterior.arquivo);
            res.status(anterior ? 200 : 201).json({
                mensagem: anterior ? 'Currículo atualizado.' : 'Currículo enviado! A escola já pode ver a sua candidatura.',
                curriculo: meuCurriculo(vaga.id, req.usuario.id),
            });
        } catch (e) {
            console.error(e);
            apagarArquivo(arquivo);
            res.status(500).json({ erro: 'Erro ao salvar o currículo.' });
        }
    });
});

// ---------- ALUNO: retirar candidatura ----------
router.delete('/publicacoes/:id/curriculo', verificarAutenticado, apenasAluno, (req, res) => {
    try {
        const atual = db.prepare('SELECT id, arquivo FROM curriculos WHERE publicacao_id = ? AND usuario_id = ?').get(req.params.id, req.usuario.id);
        if (!atual) return res.status(404).json({ erro: 'Você não enviou currículo para esta vaga.' });
        db.prepare('DELETE FROM curriculos WHERE id = ?').run(atual.id);
        apagarArquivo(atual.arquivo);
        res.json({ mensagem: 'Candidatura retirada. O currículo foi apagado.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Erro ao retirar o currículo.' });
    }
});

// ---------- ADMIN: listar ----------
router.get('/curriculos', verificarAutenticado, apenasAdmin, (req, res) => {
    try {
        const vaga = parseInt(req.query.vaga, 10);
        const linhas = db.prepare(`
            SELECT
                curriculos.id, curriculos.nome_original, curriculos.tamanho, curriculos.mensagem,
                curriculos.enviado_em, curriculos.visto_em,
                publicacoes.id AS vaga_id, publicacoes.titulo AS vaga_titulo, publicacoes.criado_em AS vaga_criada_em,
                usuarios.id AS aluno_id, usuarios.nome AS aluno_nome, usuarios.rm AS aluno_rm,
                usuarios.email AS aluno_email, usuarios.telefone AS aluno_telefone, usuarios.foto_url AS aluno_foto
            FROM curriculos
            JOIN publicacoes ON publicacoes.id = curriculos.publicacao_id
            JOIN usuarios ON usuarios.id = curriculos.usuario_id
            ${Number.isFinite(vaga) ? 'WHERE publicacoes.id = ?' : ''}
            ORDER BY curriculos.enviado_em DESC, curriculos.id DESC
        `).all(...(Number.isFinite(vaga) ? [vaga] : []));
        res.json(linhas);
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Erro ao carregar os currículos.' });
    }
});

// ---------- ADMIN: descartar ----------
router.delete('/curriculos/:id', verificarAutenticado, apenasAdmin, (req, res) => {
    try {
        const atual = db.prepare('SELECT id, arquivo FROM curriculos WHERE id = ?').get(req.params.id);
        if (!atual) return res.status(404).json({ erro: 'Currículo não encontrado.' });
        db.prepare('DELETE FROM curriculos WHERE id = ?').run(atual.id);
        apagarArquivo(atual.arquivo);
        res.json({ mensagem: 'Currículo descartado.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: 'Erro ao descartar o currículo.' });
    }
});

// ---------- BAIXAR O PDF (admin: qualquer um · aluno: só o próprio) ----------
router.get('/curriculos/:id/arquivo', verificarAutenticado, (req, res) => {
    const c = db.prepare('SELECT id, usuario_id, arquivo, nome_original, visto_em FROM curriculos WHERE id = ?').get(req.params.id);
    const admin = ADMINS.includes(req.usuario?.tipo);
    if (!c || (!admin && c.usuario_id !== req.usuario.id)) {
        return res.status(404).json({ erro: 'Currículo não encontrado.' });
    }
    const caminho = path.join(CURRICULOS_DIR, path.basename(c.arquivo));
    if (!fs.existsSync(caminho)) return res.status(404).json({ erro: 'O arquivo deste currículo não existe mais.' });

    if (admin && !c.visto_em) db.prepare("UPDATE curriculos SET visto_em = datetime('now') WHERE id = ?").run(c.id);

    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(c.nome_original)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
    });
    res.sendFile(caminho);
});

/** Apaga os currículos de um usuário (antes de excluir a conta). */
function apagarCurriculosDoUsuario(usuarioId) {
    const arquivos = db.prepare('SELECT arquivo FROM curriculos WHERE usuario_id = ?').all(usuarioId);
    db.prepare('DELETE FROM curriculos WHERE usuario_id = ?').run(usuarioId);
    arquivos.forEach((c) => apagarArquivo(c.arquivo));
}

module.exports = { rotasCurriculos: router, apagarCurriculosDoUsuario, ehVaga };
