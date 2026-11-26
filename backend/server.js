require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { login } = require('./auth');
const { listarPublicacoes, listarEventosPublicos, listarAvisosTv, criarPublicacao, marcarLida, desmarcarLida } = require('./publicacoes');
const { listarCategorias } = require('./categorias');
const { db } = require('./db');
const { enviarBoasVindas, enviarNovaPublicacao } = require('./mailer');
const { sanitizarConteudo, temTexto, longoDemais } = require('./conteudo');
const { verificarAutenticado, apenasSuperAdmin, apenasLeitor, apenasPublicador } = require('./middlewares/auth');
const { podeVerCategoria } = require('./acesso');
const rotasAcessos = require('./rotas-acessos');
const { rotasCurriculos, apagarCurriculosDoUsuario } = require('./curriculos');
const { apagarPublicacao, agendarLimpeza } = require('./limpeza');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(rotasAcessos);
app.use(rotasCurriculos); // currículos dos alunos nas vagas (ver curriculos.js)

// ---------- UPLOAD DE IMAGENS ----------
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Garante que a pasta de uploads existe
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve as imagens salvas como arquivos estáticos (ex: /uploads/123.jpg)
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const sufixoUnico = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extensao = path.extname(file.originalname);
        cb(null, `${sufixoUnico}${extensao}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Apenas arquivos de imagem são permitidos.'));
        }
        cb(null, true);
    }
});

// E-mail opcional: texto vazio vira null
function limparEmail(valor) {
    const texto = String(valor ?? '').trim();
    return texto ? texto : null;
}

// Apaga do disco uma imagem salva em /uploads (ignora se não existir)
function apagarImagem(imagemUrl) {
    if (!imagemUrl) return;
    try {
        fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(imagemUrl)));
    } catch (err) {
        // arquivo já não existe: sem problema
    }
}

// Envia o e-mail de nova publicação para todos os usuários que têm e-mail
// cadastrado, menos o super admin. Roda em segundo plano e nunca derruba a rota.
function notificarNovaPublicacao({ titulo, conteudo, categoria_id }) {
    try {
        const categoria = db.prepare('SELECT nome FROM categorias WHERE id = ?').get(categoria_id);

        const usuarios = db.prepare(`
            SELECT nome, email, tipo
            FROM usuarios
            WHERE email IS NOT NULL AND email != '' AND tipo != 'super_admin'
        `).all().filter((u) => podeVerCategoria(u.tipo, categoria?.nome)); // só quem pode ver a publicação

        if (usuarios.length === 0) return;

        enviarNovaPublicacao(usuarios, {
            titulo,
            conteudo,
            categoria: categoria?.nome,
        }).catch((err) => console.error('Erro ao enviar notificações:', err));
    } catch (err) {
        console.error('Erro ao preparar notificações:', err);
    }
}

// ---------- LOGIN ----------
app.post('/login', (req, res) => {
    const { rm, senha } = req.body;

    if (!rm || !senha) {
        return res.status(400).json({ erro: 'RM e senha são obrigatórios' });
    }

    const usuario = login(rm, senha);

    if (!usuario) {
        return res.status(401).json({ erro: 'RM ou senha inválidos' });
    }

    // registra o login para o relatório de acessos
    try {
        db.prepare("INSERT INTO acessos (usuario_id, evento) VALUES (?, 'login')").run(usuario.id);
    } catch (err) {
        console.error('Falha ao registrar login:', err); // não impede o login
    }

    const token = jwt.sign(
        { id: usuario.id, rm: usuario.rm, nome: usuario.nome, tipo: usuario.tipo },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    res.json({ usuario, token });
});

// ---------- RECUPERAR SENHA ----------
app.post('/recuperar-senha', (req, res) => {
    const { rm, novaSenha } = req.body;

    if (!rm || !novaSenha) {
        return res.status(400).json({ erro: 'RM e nova senha são obrigatórios' });
    }

    if (novaSenha.length < 6) {
        return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    const usuario = db.prepare('SELECT id FROM usuarios WHERE rm = ?').get(rm);

    if (!usuario) {
        return res.status(404).json({ erro: 'RM não encontrado.' });
    }

    const senhaHash = bcrypt.hashSync(novaSenha, 10);

    db.prepare('UPDATE usuarios SET senha = ? WHERE id = ?').run(senhaHash, usuario.id);

    res.json({ mensagem: 'Senha redefinida com sucesso!' });
});

// ---------- CADASTRO (só super admin) ----------
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

app.post('/cadastro', verificarAutenticado, apenasSuperAdmin, async (req, res) => {
    const { rm, nome, senha, telefone, tipo } = req.body;
    const email = limparEmail(req.body.email); // opcional: o próprio usuário pode informar depois, no perfil

    if (!rm || !nome || !senha || !tipo) {
        return res.status(400).json({ erro: 'Preencha RM, nome, senha e tipo.' });
    }

    if (!['comum', 'professor', 'coordenacao', 'administrador'].includes(tipo)) {
        return res.status(400).json({ erro: 'Tipo inválido. Use "comum" (aluno), "professor", "coordenacao" ou "administrador" (publicador).' });
    }

    if (!/^\d{5}$/.test(String(rm).trim())) {
        return res.status(400).json({ erro: 'O RM deve ter exatamente 5 números.' });
    }
    if (email && !EMAIL_VALIDO.test(email)) {
        return res.status(400).json({ erro: 'Informe um e-mail válido.' });
    }
    if (String(senha).length < 6) {
        return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    try {
        const jaExiste = email
            ? db.prepare('SELECT id FROM usuarios WHERE rm = ? OR email = ?').get(rm, email)
            : db.prepare('SELECT id FROM usuarios WHERE rm = ?').get(rm);
        if (jaExiste) {
            return res.status(409).json({ erro: email ? 'RM ou e-mail já cadastrado.' : 'RM já cadastrado.' });
        }

        const senhaHash = bcrypt.hashSync(senha, 10);

        const resultado = db.prepare(`
            INSERT INTO usuarios (rm, nome, email, senha, tipo, telefone)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(rm, nome, email, senhaHash, tipo, ['comum', 'professor', 'coordenacao'].includes(tipo) ? (telefone || null) : null);

        if (email) enviarBoasVindas(email, nome);

        res.status(201).json({ mensagem: 'Conta criada com sucesso!', id: resultado.lastInsertRowid });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar conta.' });
    }
});

// ---------- LISTAR USUÁRIOS (só super admin) ----------
app.get('/usuarios', verificarAutenticado, apenasSuperAdmin, (req, res) => {
    try {
        const usuarios = db.prepare(`
            SELECT id, rm, nome, email, tipo, telefone, foto_url
            FROM usuarios
            ORDER BY id DESC
        `).all();

        res.json(usuarios);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar usuários.' });
    }
});

// ---------- EDITAR USUÁRIO (só super admin) ----------
app.put('/usuarios/:id', verificarAutenticado, apenasSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { nome, telefone, tipo } = req.body;
    const email = limparEmail(req.body.email);
    const novoRm = req.body.rm === undefined ? null : String(req.body.rm).trim();

    if (!nome || !tipo) {
        return res.status(400).json({ erro: 'Nome e tipo são obrigatórios.' });
    }
    if (novoRm !== null && !/^\d{5}$/.test(novoRm)) {
        return res.status(400).json({ erro: 'O RM deve ter exatamente 5 números.' });
    }

    if (!['comum', 'professor', 'coordenacao', 'administrador'].includes(tipo)) {
        return res.status(400).json({ erro: 'Tipo inválido.' });
    }

    if (email && !EMAIL_VALIDO.test(email)) {
        return res.status(400).json({ erro: 'Informe um e-mail válido.' });
    }

    try {
        const usuario = db.prepare('SELECT id, rm FROM usuarios WHERE id = ?').get(id);
        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }

        if (email) {
            const emailEmUso = db.prepare('SELECT id FROM usuarios WHERE email = ? AND id != ?').get(email, id);
            if (emailEmUso) {
                return res.status(409).json({ erro: 'E-mail já está em uso por outro usuário.' });
            }
        }
        if (novoRm !== null && novoRm !== usuario.rm) {
            const rmEmUso = db.prepare('SELECT id FROM usuarios WHERE rm = ? AND id != ?').get(novoRm, id);
            if (rmEmUso) {
                return res.status(409).json({ erro: 'Este RM já pertence a outro usuário.' });
            }
        }

        db.prepare(`
            UPDATE usuarios
            SET rm = ?, nome = ?, email = ?, telefone = ?, tipo = ?
            WHERE id = ?
        `).run(novoRm ?? usuario.rm, nome, email, ['comum', 'professor', 'coordenacao'].includes(tipo) ? (telefone || null) : null, tipo, id);

        res.json({ mensagem: 'Usuário atualizado com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
    }
});

// ---------- APAGAR USUÁRIO (só super admin) ----------
app.delete('/usuarios/:id', verificarAutenticado, apenasSuperAdmin, (req, res) => {
    const { id } = req.params;

    if (String(req.usuario.id) === String(id)) {
        return res.status(400).json({ erro: 'Você não pode apagar sua própria conta.' });
    }

    try {
        const usuario = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(id);
        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }

        apagarCurriculosDoUsuario(id); // apaga também os PDFs do disco
        // o histórico de visualizações fica (conta para o relatório), mas sem apontar para a pessoa
        db.prepare('UPDATE visualizacoes SET usuario_id = NULL WHERE usuario_id = ?').run(id);
        db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);

        res.json({ mensagem: 'Usuário apagado com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao apagar usuário.' });
    }
});

// ---------- PUBLICAÇÕES ----------
app.get('/publicacoes', verificarAutenticado, (req, res) => {
    const publicacoes = listarPublicacoes(req.usuario.id, req.usuario.tipo);
    res.json(publicacoes);
});

// Data de hoje no fuso de Brasília ('YYYY-MM-DD'), independente do fuso do servidor
function hojeEmSaoPaulo() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

// Mensagem de erro se a data do evento for inválida ou já tiver passado; senão null
// "Divulgar ao público": só vale para evento com data, em categoria aberta
function lerPublico(valor) {
    return ['1', 'true', 'on', true, 1].includes(valor);
}

function erroPublico(publico, dataEvento, nomeCategoria) {
    if (!publico) return null;
    if (!dataEvento) return 'Para divulgar ao público, defina a data do evento.';
    if (!podeVerCategoria('comum', nomeCategoria)) {
        return 'Publicações das áreas restritas não podem ser divulgadas ao público.';
    }
    return null;
}

function erroDataEvento(data) {
    if (!data) return null;
    // formato AAAA-MM-DD e que seja uma data real (rejeita 2026-13-45, 2026-02-31...)
    const d = new Date(`${data}T00:00:00Z`);
    const real = /^\d{4}-\d{2}-\d{2}$/.test(data) && !isNaN(d) && d.toISOString().slice(0, 10) === data;
    if (!real) return 'Data do evento inválida.';
    if (data < hojeEmSaoPaulo()) return 'A data do evento não pode ser anterior a hoje.';
    return null;
}

// ---------- CRIAR PUBLICAÇÃO (administrador e super admin) ----------
app.post('/publicacoes', verificarAutenticado, apenasPublicador, upload.single('imagem'), (req, res) => {
    const { titulo, categoria_id, data_evento } = req.body;
    const autor_id = req.usuario.id; // vem do token, nunca do corpo da requisição

    const imagem_url = req.file ? `/uploads/${req.file.filename}` : null;

    // a descrição vem formatada (HTML do editor): é limpa aqui antes de salvar
    const conteudo = sanitizarConteudo(req.body.conteudo);

    if (!titulo || !temTexto(conteudo)) {
        apagarImagem(imagem_url);
        return res.status(400).json({ erro: 'Título e conteúdo são obrigatórios' });
    }

    if (longoDemais(conteudo)) {
        apagarImagem(imagem_url);
        return res.status(400).json({ erro: 'A descrição está muito longa.' });
    }

    // "Anexos" é o calendário: reúne as publicações que têm data, de qualquer categoria.
    // Não se publica direto nela: escolha a categoria e defina a data do evento.
    const categoria = db.prepare('SELECT nome FROM categorias WHERE id = ?').get(categoria_id);
    if (!categoria) {
        apagarImagem(imagem_url);
        return res.status(400).json({ erro: 'Categoria inválida.' });
    }
    if (categoria.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'anexos') {
        apagarImagem(imagem_url);
        return res.status(400).json({ erro: 'Não é possível publicar na categoria Anexos. Escolha outra categoria e defina a data do evento: ela aparece no calendário de Anexos.' });
    }

    const erroData = erroDataEvento(data_evento);
    if (erroData) {
        apagarImagem(imagem_url);
        return res.status(400).json({ erro: erroData });
    }

    const publico = lerPublico(req.body.publico);
    const erroPub = erroPublico(publico, data_evento, categoria.nome);
    if (erroPub) {
        apagarImagem(imagem_url);
        return res.status(400).json({ erro: erroPub });
    }

    const id = criarPublicacao({ titulo, conteudo, categoria_id, autor_id, imagem_url, data_evento, publico });

    // avisa os usuários por e-mail em segundo plano (não atrasa a resposta)
    notificarNovaPublicacao({ titulo, conteudo, categoria_id });

    res.status(201).json({ id, imagem_url, data_evento });
});

// Super admin mexe em qualquer publicação; administrador só nas que ele mesmo criou
function podeGerenciar(usuario, publicacao) {
    return usuario.tipo === 'super_admin'
        || (usuario.tipo === 'administrador' && Number(publicacao.autor_id) === Number(usuario.id));
}

// ---------- EDITAR PUBLICAÇÃO (super admin: todas · administrador: só as próprias) ----------
app.put('/publicacoes/:id', verificarAutenticado, apenasPublicador, upload.single('imagem'), (req, res) => {
    const { id } = req.params;
    const { titulo, data_evento } = req.body;
    const novaImagem = req.file ? `/uploads/${req.file.filename}` : null;
    const conteudo = sanitizarConteudo(req.body.conteudo);

    if (!titulo || !temTexto(conteudo)) {
        apagarImagem(novaImagem);
        return res.status(400).json({ erro: 'Título e conteúdo são obrigatórios' });
    }

    if (longoDemais(conteudo)) {
        apagarImagem(novaImagem);
        return res.status(400).json({ erro: 'A descrição está muito longa.' });
    }

    try {
        const atual = db.prepare('SELECT * FROM publicacoes WHERE id = ?').get(id);
        if (!atual) {
            apagarImagem(novaImagem);
            return res.status(404).json({ erro: 'Publicação não encontrada.' });
        }

        if (!podeGerenciar(req.usuario, atual)) {
            apagarImagem(novaImagem);
            return res.status(403).json({ erro: 'Você só pode editar as suas próprias publicações.' });
        }

        // campo enviado (mesmo vazio) vale e permite limpar a data; ausente mantém a antiga
        const dataFinal = data_evento !== undefined ? (data_evento || null) : atual.data_evento;

        // só valida se a data mudou (publicações antigas com data já passada continuam editáveis)
        if (dataFinal !== atual.data_evento) {
            const erroData = erroDataEvento(dataFinal);
            if (erroData) {
                apagarImagem(novaImagem);
                return res.status(400).json({ erro: erroData });
            }
        }

        const publicoFinal = req.body.publico !== undefined ? lerPublico(req.body.publico) : Boolean(atual.publico);
        const categoriaAtual = db.prepare('SELECT nome FROM categorias WHERE id = ?').get(atual.categoria_id);
        const erroPub = erroPublico(publicoFinal, dataFinal, categoriaAtual?.nome);
        if (erroPub) {
            apagarImagem(novaImagem);
            return res.status(400).json({ erro: erroPub });
        }

        db.prepare(`
            UPDATE publicacoes
            SET titulo = ?, conteudo = ?, data_evento = ?, publico = ?, imagem_url = ?
            WHERE id = ?
        `).run(
            titulo,
            conteudo,
            dataFinal,
            publicoFinal ? 1 : 0,
            novaImagem || atual.imagem_url,
            id
        );

        // se trocou a imagem, remove a antiga do disco
        if (novaImagem) apagarImagem(atual.imagem_url);

        res.json({ mensagem: 'Publicação atualizada com sucesso!' });
    } catch (err) {
        console.error(err);
        apagarImagem(novaImagem);
        res.status(500).json({ erro: 'Erro ao atualizar publicação.' });
    }
});

// ---------- EXCLUIR PUBLICAÇÃO (super admin: todas · administrador: só as próprias) ----------
app.delete('/publicacoes/:id', verificarAutenticado, apenasPublicador, (req, res) => {
    const { id } = req.params;

    try {
        const atual = db.prepare('SELECT * FROM publicacoes WHERE id = ?').get(id);
        if (!atual) {
            return res.status(404).json({ erro: 'Publicação não encontrada.' });
        }

        if (!podeGerenciar(req.usuario, atual)) {
            return res.status(403).json({ erro: 'Você só pode excluir as suas próprias publicações.' });
        }

        // leva junto leituras, currículos enviados e a imagem (ver limpeza.js)
        apagarPublicacao(id);

        res.json({ mensagem: 'Publicação excluída com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao excluir publicação.' });
    }
});

// ---------- AGENDA PÚBLICA (sem login) ----------
// Alimenta o calendário da página inicial. Só devolve eventos que o administrador marcou
// como públicos e que não são de áreas restritas.
app.get('/eventos-publicos', (req, res) => {
    try {
        res.set('Cache-Control', 'public, max-age=30');
        res.json(listarEventosPublicos());
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Não foi possível carregar a agenda de eventos.' });
    }
});

// ---------- MURAL DA TV (sem login) ----------
// A TV do corredor abre /tv e fica horas ligada, então não depende de sessão.
// Só sai daqui o que é aberto a todos (nunca as áreas restritas).
app.get('/tv/avisos', (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const limite = (v, padrao) => Math.min(Math.max(parseInt(v, 10) || padrao, 1), 20);
        res.json({
            ...listarAvisosTv({
                hoje: hojeEmSaoPaulo(),
                limiteRecentes: limite(req.query.recentes, 10),
                limiteEventos: limite(req.query.eventos, 6),
            }),
            atualizado_em: new Date().toISOString(),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Não foi possível carregar os avisos da TV.' });
    }
});

// ---------- MARCAR COMO LIDA ----------
function usuarioVePublicacao(usuario, id) {
    const p = db.prepare(`
        SELECT categorias.nome AS categoria FROM publicacoes
        LEFT JOIN categorias ON categorias.id = publicacoes.categoria_id
        WHERE publicacoes.id = ?`).get(id);
    return Boolean(p) && podeVerCategoria(usuario.tipo, p.categoria);
}

app.post('/publicacoes/:id/lida', verificarAutenticado, apenasLeitor, (req, res) => {
    try {
        if (!usuarioVePublicacao(req.usuario, req.params.id)) {
            return res.status(404).json({ erro: 'Publicação não encontrada.' });
        }
        marcarLida(req.usuario.id, Number(req.params.id));
        res.json({ lida: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao marcar como lida.' });
    }
});

app.delete('/publicacoes/:id/lida', verificarAutenticado, apenasLeitor, (req, res) => {
    try {
        desmarcarLida(req.usuario.id, Number(req.params.id));
        res.json({ lida: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao desmarcar como lida.' });
    }
});

// ---------- PERFIL (qualquer usuário logado) ----------
const COLUNAS_PERFIL = 'id, rm, nome, email, tipo, telefone, foto_url';
const uploadFoto = multer({
    storage,
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB (o site já reduz a foto antes de enviar)
    fileFilter: (req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return cb(new Error('FORMATO'));
        }
        cb(null, true);
    }
}).single('foto');

const perfilDoUsuario = (id) => db.prepare(`SELECT ${COLUNAS_PERFIL} FROM usuarios WHERE id = ?`).get(id);

app.get('/perfil', verificarAutenticado, (req, res) => {
    const usuario = perfilDoUsuario(req.usuario.id);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json({ usuario });
});

// Altera o e-mail (usado para receber notificações). RM e nome só o super admin altera,
// na tela de cadastro de usuários.
app.put('/perfil', verificarAutenticado, (req, res) => {
    const email = limparEmail(req.body.email);
    if (email && !EMAIL_VALIDO.test(email)) {
        return res.status(400).json({ erro: 'Informe um e-mail válido.' });
    }
    try {
        if (email) {
            const emUso = db.prepare('SELECT id FROM usuarios WHERE email = ? AND id != ?').get(email, req.usuario.id);
            if (emUso) return res.status(409).json({ erro: 'Este e-mail já está em uso por outra conta.' });
        }
        db.prepare('UPDATE usuarios SET email = ? WHERE id = ?').run(email, req.usuario.id);
        res.json({ mensagem: email ? 'E-mail salvo. Você receberá as notificações nele.' : 'E-mail removido. Você não receberá notificações por e-mail.', usuario: perfilDoUsuario(req.usuario.id) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao salvar o perfil.' });
    }
});

app.post('/perfil/foto', verificarAutenticado, (req, res) => {
    uploadFoto(req, res, (err) => {
        if (err) {
            const msg = err.code === 'LIMIT_FILE_SIZE'
                ? 'A foto é grande demais (máximo 3 MB).'
                : 'Envie uma imagem JPG, PNG ou WebP.';
            return res.status(400).json({ erro: msg });
        }
        if (!req.file) return res.status(400).json({ erro: 'Escolha uma imagem.' });
        try {
            const atual = db.prepare('SELECT foto_url FROM usuarios WHERE id = ?').get(req.usuario.id);
            db.prepare('UPDATE usuarios SET foto_url = ? WHERE id = ?').run(`/uploads/${req.file.filename}`, req.usuario.id);
            apagarImagem(atual?.foto_url);
            res.json({ mensagem: 'Foto atualizada.', usuario: perfilDoUsuario(req.usuario.id) });
        } catch (e) {
            console.error(e);
            apagarImagem(`/uploads/${req.file.filename}`);
            res.status(500).json({ erro: 'Erro ao salvar a foto.' });
        }
    });
});

app.delete('/perfil/foto', verificarAutenticado, (req, res) => {
    try {
        const atual = db.prepare('SELECT foto_url FROM usuarios WHERE id = ?').get(req.usuario.id);
        db.prepare('UPDATE usuarios SET foto_url = NULL WHERE id = ?').run(req.usuario.id);
        apagarImagem(atual?.foto_url);
        res.json({ mensagem: 'Foto removida.', usuario: perfilDoUsuario(req.usuario.id) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover a foto.' });
    }
});

// ---------- CATEGORIAS ----------
app.get('/categorias', (req, res) => {
    const categorias = listarCategorias();
    res.json(categorias);
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    agendarLimpeza(); // apaga avisos com mais de 30 dias sem evento futuro (ver limpeza.js)
});