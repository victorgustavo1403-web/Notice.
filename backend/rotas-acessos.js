// Registro de navegação e o relatório de acessos (super admin).
//
//   POST /eventos                         login/home/categoria (navegação)
//   POST /publicacoes/:id/visualizacao    alguém abriu um aviso
//   GET  /relatorios/acessos              relatório do período (?inicio&fim&categoria)
//   GET  /relatorios/avisos/:id           detalhe de um aviso: quem viu, quando
//   GET  /relatorios/acessos/csv          avisos do período em CSV
//   GET  /relatorios/usuarios/csv         usuários e logins em CSV
//
// Datas no banco ficam em UTC; o relatório trabalha em dias de São Paulo (UTC-3).
const { Router } = require('express');
const { db } = require('./db');
const { verificarAutenticado, apenasSuperAdmin } = require('./middlewares/auth');
const { podeVerCategoria } = require('./acesso');

const router = Router();

const EVENTOS_VALIDOS = ['ver_home', 'ver_categoria'];
const FUSO = '-3 hours';            // UTC -> São Paulo (sem horário de verão desde 2019)
const PARA_UTC = '+3 hours';        // São Paulo -> UTC
const REPETICAO_MIN = 30;           // reabrir o mesmo aviso em menos de 30 min não conta de novo
const MAX_DIAS = 366;

const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const ehData = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(`${v}T00:00:00Z`));
const somarDias = (dia, n) => {
    const d = new Date(`${dia}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
const diasEntre = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86_400_000);

// Lê ?inicio=AAAA-MM-DD&fim=AAAA-MM-DD (ou ?dias=N). Padrão: últimos 30 dias, hoje incluso.
function lerPeriodo(query) {
    const hoje = hojeSP();
    let fim = ehData(query.fim) ? query.fim : hoje;
    let inicio;
    if (ehData(query.inicio)) inicio = query.inicio;
    else {
        const dias = Math.min(Math.max(parseInt(query.dias, 10) || 30, 1), MAX_DIAS);
        inicio = somarDias(fim, -(dias - 1));
    }
    if (inicio > fim) [inicio, fim] = [fim, inicio];
    if (diasEntre(inicio, fim) >= MAX_DIAS) inicio = somarDias(fim, -(MAX_DIAS - 1));
    const dias = diasEntre(inicio, fim) + 1;
    return {
        inicio, fim, dias,
        anteriorInicio: somarDias(inicio, -dias),
        anteriorFim: somarDias(inicio, -1),
    };
}

// limites em UTC para comparar com as colunas do banco: [inicio 00:00, fim+1 00:00) de SP
const limites = (inicio, fim) => [
    db.prepare(`SELECT datetime(?, '${PARA_UTC}') AS d`).get(inicio).d,
    db.prepare(`SELECT datetime(?, '+1 day', '${PARA_UTC}') AS d`).get(fim).d,
];

// Quantas contas podem ver cada categoria (base do "alcance")
function publicoPorCategoria() {
    const contas = db.prepare('SELECT tipo, COUNT(*) AS n FROM usuarios GROUP BY tipo').all();
    const cache = new Map();
    return (categoria) => {
        if (!cache.has(categoria)) {
            cache.set(categoria, contas.reduce((s, c) => s + (podeVerCategoria(c.tipo, categoria) ? c.n : 0), 0));
        }
        return cache.get(categoria);
    };
}

// ---------- registrar navegação ----------
router.post('/eventos', verificarAutenticado, (req, res) => {
    const { evento, referencia } = req.body;
    if (!EVENTOS_VALIDOS.includes(evento)) {
        return res.status(400).json({ erro: 'Evento inválido' });
    }
    try {
        db.prepare('INSERT INTO acessos (usuario_id, evento, referencia) VALUES (?, ?, ?)')
            .run(req.usuario.id, evento, referencia ?? null);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao registrar evento.' });
    }
});

// ---------- registrar visualização de um aviso ----------
router.post('/publicacoes/:id/visualizacao', verificarAutenticado, (req, res) => {
    try {
        const pub = db.prepare(`
            SELECT publicacoes.id, publicacoes.titulo, categorias.nome AS categoria
            FROM publicacoes LEFT JOIN categorias ON categorias.id = publicacoes.categoria_id
            WHERE publicacoes.id = ?
        `).get(req.params.id);
        if (!pub || !podeVerCategoria(req.usuario.tipo, pub.categoria)) {
            return res.status(404).json({ erro: 'Publicação não encontrada.' });
        }
        const recente = db.prepare(`
            SELECT 1 FROM visualizacoes
            WHERE usuario_id = ? AND publicacao_id = ? AND visto_em >= datetime('now', ?)
        `).get(req.usuario.id, pub.id, `-${REPETICAO_MIN} minutes`);
        if (!recente) {
            db.prepare(`
                INSERT INTO visualizacoes (publicacao_id, titulo, categoria, usuario_id, tipo_usuario)
                VALUES (?, ?, ?, ?, ?)
            `).run(pub.id, pub.titulo, pub.categoria, req.usuario.id, req.usuario.tipo);
        }
        res.json({ ok: true, contada: !recente });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao registrar visualização.' });
    }
});

// ---------- relatório do período ----------
router.get('/relatorios/acessos', verificarAutenticado, apenasSuperAdmin, (req, res) => {
    try {
        const periodo = lerPeriodo(req.query);
        const categoria = typeof req.query.categoria === 'string' && req.query.categoria.trim() ? req.query.categoria.trim() : null;
        const [de, ate] = limites(periodo.inicio, periodo.fim);
        const [deAnt, ateAnt] = limites(periodo.anteriorInicio, periodo.anteriorFim);
        const filtroCat = 'AND (? IS NULL OR v.categoria = ?)';

        const resumoVis = (a, b) => db.prepare(`
            SELECT COUNT(*) AS visualizacoes,
                   COUNT(DISTINCT v.usuario_id) AS pessoas,
                   COUNT(DISTINCT v.publicacao_id) AS avisos
            FROM visualizacoes v
            WHERE v.visto_em >= ? AND v.visto_em < ? ${filtroCat}
        `).get(a, b, categoria, categoria);

        const ativosEntre = (a, b) => db.prepare(`
            SELECT COUNT(DISTINCT usuario_id) AS n FROM acessos WHERE criado_em >= ? AND criado_em < ?
        `).get(a, b).n;

        const publicadosEntre = (a, b) => db.prepare(`
            SELECT COUNT(*) AS n FROM publicacoes p LEFT JOIN categorias c ON c.id = p.categoria_id
            WHERE p.criado_em >= ? AND p.criado_em < ? AND (? IS NULL OR c.nome = ?)
        `).get(a, b, categoria, categoria).n;

        const atual = resumoVis(de, ate);
        const anterior = resumoVis(deAnt, ateAnt);
        const totalUsuarios = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n;

        const resumo = {
            ...atual,
            publicados: publicadosEntre(de, ate),
            ativos: ativosEntre(de, ate),
            logins: db.prepare(`SELECT COUNT(*) AS n FROM acessos WHERE evento = 'login' AND criado_em >= ? AND criado_em < ?`).get(de, ate).n,
            lidas: db.prepare(`
                SELECT COUNT(*) AS n FROM leituras l
                JOIN publicacoes p ON p.id = l.publicacao_id LEFT JOIN categorias c ON c.id = p.categoria_id
                WHERE l.lida_em >= ? AND l.lida_em < ? AND (? IS NULL OR c.nome = ?)
            `).get(de, ate, categoria, categoria).n,
            totalUsuarios,
            anterior: {
                ...anterior,
                publicados: publicadosEntre(deAnt, ateAnt),
                ativos: ativosEntre(deAnt, ateAnt),
            },
        };

        // série diária (dias sem nada entram com zero)
        const visPorDia = db.prepare(`
            SELECT date(v.visto_em, '${FUSO}') AS dia, COUNT(*) AS visualizacoes, COUNT(DISTINCT v.usuario_id) AS pessoas
            FROM visualizacoes v WHERE v.visto_em >= ? AND v.visto_em < ? ${filtroCat}
            GROUP BY dia
        `).all(de, ate, categoria, categoria);
        const loginsPorDia = db.prepare(`
            SELECT date(criado_em, '${FUSO}') AS dia, COUNT(*) AS logins
            FROM acessos WHERE evento = 'login' AND criado_em >= ? AND criado_em < ? GROUP BY dia
        `).all(de, ate);
        const mapaVis = new Map(visPorDia.map((d) => [d.dia, d]));
        const mapaLog = new Map(loginsPorDia.map((d) => [d.dia, d.logins]));
        const serie = [];
        for (let dia = periodo.inicio; dia <= periodo.fim; dia = somarDias(dia, 1)) {
            serie.push({
                dia,
                visualizacoes: mapaVis.get(dia)?.visualizacoes ?? 0,
                pessoas: mapaVis.get(dia)?.pessoas ?? 0,
                logins: mapaLog.get(dia) ?? 0,
            });
        }

        // por categoria: todas as categorias, mesmo as sem movimento
        const publico = publicoPorCategoria();
        const nomesCategorias = [...new Set(db.prepare('SELECT nome FROM categorias ORDER BY nome').all().map((c) => c.nome))];
        const visPorCat = new Map(db.prepare(`
            SELECT v.categoria, COUNT(*) AS visualizacoes, COUNT(DISTINCT v.usuario_id) AS pessoas, COUNT(DISTINCT v.publicacao_id) AS avisos
            FROM visualizacoes v WHERE v.visto_em >= ? AND v.visto_em < ? GROUP BY v.categoria
        `).all(de, ate).map((c) => [c.categoria, c]));
        const pubPorCat = new Map(db.prepare(`
            SELECT c.nome AS categoria, COUNT(*) AS n FROM publicacoes p LEFT JOIN categorias c ON c.id = p.categoria_id
            WHERE p.criado_em >= ? AND p.criado_em < ? GROUP BY c.nome
        `).all(de, ate).map((c) => [c.categoria, c.n]));
        const porCategoria = [...new Set([...nomesCategorias, ...visPorCat.keys()])]
            .filter(Boolean)
            // categorias sem nenhum movimento no período não entram (exceto a filtrada)
            .filter((nome) => nome === categoria || visPorCat.has(nome) || pubPorCat.has(nome))
            .map((nome) => {
                const v = visPorCat.get(nome) ?? {};
                return {
                    categoria: nome,
                    publicados: pubPorCat.get(nome) ?? 0,
                    visualizacoes: v.visualizacoes ?? 0,
                    pessoas: v.pessoas ?? 0,
                    avisos: v.avisos ?? 0,
                    publico: publico(nome),
                };
            })
            .sort((a, b) => b.visualizacoes - a.visualizacoes || a.categoria.localeCompare(b.categoria, 'pt-BR'));

        // quem visualiza: por perfil
        const contasPorTipo = db.prepare('SELECT tipo, COUNT(*) AS total FROM usuarios GROUP BY tipo').all();
        const ativosPorTipo = new Map(db.prepare(`
            SELECT u.tipo, COUNT(DISTINCT a.usuario_id) AS n FROM acessos a JOIN usuarios u ON u.id = a.usuario_id
            WHERE a.criado_em >= ? AND a.criado_em < ? GROUP BY u.tipo
        `).all(de, ate).map((t) => [t.tipo, t.n]));
        const visPorTipo = new Map(db.prepare(`
            SELECT v.tipo_usuario AS tipo, COUNT(*) AS visualizacoes, COUNT(DISTINCT v.usuario_id) AS pessoas
            FROM visualizacoes v WHERE v.visto_em >= ? AND v.visto_em < ? ${filtroCat} GROUP BY v.tipo_usuario
        `).all(de, ate, categoria, categoria).map((t) => [t.tipo, t]));
        const porTipo = contasPorTipo.map((t) => ({
            tipo: t.tipo,
            contas: t.total,
            ativos: ativosPorTipo.get(t.tipo) ?? 0,
            visualizacoes: visPorTipo.get(t.tipo)?.visualizacoes ?? 0,
            pessoas: visPorTipo.get(t.tipo)?.pessoas ?? 0,
        }));

        // horário em que os avisos são abertos (0–23h de São Paulo)
        const horas = new Map(db.prepare(`
            SELECT CAST(strftime('%H', v.visto_em, '${FUSO}') AS INTEGER) AS hora, COUNT(*) AS n
            FROM visualizacoes v WHERE v.visto_em >= ? AND v.visto_em < ? ${filtroCat} GROUP BY hora
        `).all(de, ate, categoria, categoria).map((h) => [h.hora, h.n]));
        const porHora = Array.from({ length: 24 }, (_, hora) => ({ hora, visualizacoes: horas.get(hora) ?? 0 }));

        res.json({
            periodo: { inicio: periodo.inicio, fim: periodo.fim, dias: periodo.dias, anteriorInicio: periodo.anteriorInicio, anteriorFim: periodo.anteriorFim },
            categoria,
            resumo,
            serie,
            porCategoria,
            porTipo,
            porHora,
            avisos: avisosDoPeriodo(de, ate, categoria, publico),
            naoAcessaram: db.prepare(`
                SELECT rm, nome, tipo FROM usuarios
                WHERE id NOT IN (SELECT DISTINCT usuario_id FROM acessos WHERE evento = 'login')
                ORDER BY nome
            `).all(),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao gerar relatório.' });
    }
});

// Avisos com visualização no período + os publicados no período (mesmo sem visualização)
function avisosDoPeriodo(de, ate, categoria, publico) {
    const vistos = db.prepare(`
        SELECT v.publicacao_id AS id,
               MAX(v.titulo) AS titulo_salvo, MAX(v.categoria) AS categoria_salva,
               COUNT(*) AS visualizacoes, COUNT(DISTINCT v.usuario_id) AS pessoas,
               MAX(v.visto_em) AS ultima
        FROM visualizacoes v
        WHERE v.visto_em >= ? AND v.visto_em < ? AND (? IS NULL OR v.categoria = ?)
        GROUP BY v.publicacao_id
    `).all(de, ate, categoria, categoria);

    const publicados = db.prepare(`
        SELECT p.id FROM publicacoes p LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE p.criado_em >= ? AND p.criado_em < ? AND (? IS NULL OR c.nome = ?)
    `).all(de, ate, categoria, categoria);

    const ids = [...new Set([...vistos.map((v) => v.id), ...publicados.map((p) => p.id)])];
    if (ids.length === 0) return [];

    const marcadores = ids.map(() => '?').join(',');
    const atuais = new Map(db.prepare(`
        SELECT p.id, p.titulo, p.criado_em, p.data_evento, c.nome AS categoria, u.nome AS autor,
               (SELECT COUNT(*) FROM leituras l WHERE l.publicacao_id = p.id) AS lidas
        FROM publicacoes p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        LEFT JOIN usuarios u ON u.id = p.autor_id
        WHERE p.id IN (${marcadores})
    `).all(...ids).map((p) => [p.id, p]));
    const mapaVistos = new Map(vistos.map((v) => [v.id, v]));

    return ids.map((id) => {
        const p = atuais.get(id);
        const v = mapaVistos.get(id);
        const cat = p?.categoria ?? v?.categoria_salva ?? null;
        const alvo = publico(cat);
        const pessoas = v?.pessoas ?? 0;
        return {
            id,
            titulo: p?.titulo ?? v?.titulo_salvo ?? 'Aviso removido',
            categoria: cat,
            autor: p?.autor ?? null,
            publicado_em: p?.criado_em ?? null,
            data_evento: p?.data_evento ?? null,
            removido: !p,                     // já saiu do sistema (limpeza ou exclusão)
            visualizacoes: v?.visualizacoes ?? 0,
            pessoas,
            publico: alvo,
            alcance: alvo ? Math.round((pessoas / alvo) * 100) : 0,
            lidas: p?.lidas ?? null,
            ultima: v?.ultima ?? null,
        };
    }).sort((a, b) => b.visualizacoes - a.visualizacoes || (b.publicado_em ?? '').localeCompare(a.publicado_em ?? ''));
}

// ---------- detalhe de um aviso ----------
router.get('/relatorios/avisos/:id', verificarAutenticado, apenasSuperAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const p = db.prepare(`
            SELECT p.id, p.titulo, p.criado_em, p.data_evento, c.nome AS categoria, u.nome AS autor
            FROM publicacoes p LEFT JOIN categorias c ON c.id = p.categoria_id LEFT JOIN usuarios u ON u.id = p.autor_id
            WHERE p.id = ?
        `).get(id);
        const salvo = db.prepare('SELECT titulo, categoria FROM visualizacoes WHERE publicacao_id = ? ORDER BY id DESC LIMIT 1').get(id);
        if (!p && !salvo) return res.status(404).json({ erro: 'Aviso não encontrado.' });

        const categoria = p?.categoria ?? salvo.categoria;

        const serie = db.prepare(`
            SELECT date(visto_em, '${FUSO}') AS dia, COUNT(*) AS visualizacoes, COUNT(DISTINCT usuario_id) AS pessoas
            FROM visualizacoes WHERE publicacao_id = ? GROUP BY dia ORDER BY dia
        `).all(id);

        const pessoas = db.prepare(`
            SELECT u.id, u.nome, u.rm, u.tipo, u.foto_url,
                   MIN(v.visto_em) AS primeira, MAX(v.visto_em) AS ultima, COUNT(*) AS vezes,
                   EXISTS (SELECT 1 FROM leituras l WHERE l.publicacao_id = ? AND l.usuario_id = u.id) AS lida
            FROM visualizacoes v JOIN usuarios u ON u.id = v.usuario_id
            WHERE v.publicacao_id = ?
            GROUP BY u.id ORDER BY primeira DESC
        `).all(id, id).map((x) => ({ ...x, lida: Boolean(x.lida) }));

        const porTipo = db.prepare(`
            SELECT tipo_usuario AS tipo, COUNT(DISTINCT usuario_id) AS pessoas, COUNT(*) AS visualizacoes
            FROM visualizacoes WHERE publicacao_id = ? GROUP BY tipo_usuario ORDER BY pessoas DESC
        `).all(id);

        const publico = publicoPorCategoria()(categoria);
        const total = db.prepare('SELECT COUNT(*) AS n FROM visualizacoes WHERE publicacao_id = ?').get(id).n;

        res.json({
            aviso: {
                id,
                titulo: p?.titulo ?? salvo.titulo,
                categoria,
                autor: p?.autor ?? null,
                publicado_em: p?.criado_em ?? null,
                data_evento: p?.data_evento ?? null,
                removido: !p,
            },
            visualizacoes: total,
            publico,
            alcance: publico ? Math.round((pessoas.length / publico) * 100) : 0,
            lidas: pessoas.filter((x) => x.lida).length,
            serie,
            porTipo,
            pessoas,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao carregar o aviso.' });
    }
});

// ---------- CSV (abre certinho no Excel pt-BR) ----------
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = (cabecalho, linhas) => '﻿' + [cabecalho, ...linhas].map((l) => l.map(esc).join(';')).join('\n');
const dataBR = (v) => (v ? v.slice(0, 10).split('-').reverse().join('/') : '');

function enviarCsv(res, nome, conteudo) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.send(conteudo);
}

// avisos do período (mesmos filtros da tela)
router.get('/relatorios/acessos/csv', verificarAutenticado, apenasSuperAdmin, (req, res) => {
    try {
        const periodo = lerPeriodo(req.query);
        const categoria = typeof req.query.categoria === 'string' && req.query.categoria.trim() ? req.query.categoria.trim() : null;
        const [de, ate] = limites(periodo.inicio, periodo.fim);
        const avisos = avisosDoPeriodo(de, ate, categoria, publicoPorCategoria());
        const conteudo = csv(
            ['Aviso', 'Categoria', 'Publicado em', 'Visualizações', 'Pessoas que viram', 'Público da categoria', 'Alcance (%)', 'Marcaram como lido', 'Situação'],
            avisos.map((a) => [a.titulo, a.categoria, dataBR(a.publicado_em), a.visualizacoes, a.pessoas, a.publico, a.alcance, a.lidas ?? '', a.removido ? 'Removido' : 'No ar']),
        );
        enviarCsv(res, `avisos-${periodo.inicio}-a-${periodo.fim}.csv`, conteudo);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao exportar relatório.' });
    }
});

// usuários: último login e quanto usam
router.get('/relatorios/usuarios/csv', verificarAutenticado, apenasSuperAdmin, (req, res) => {
    try {
        const linhas = db.prepare(`
            SELECT u.rm, u.nome, u.tipo,
                   (SELECT MAX(criado_em) FROM acessos a WHERE a.usuario_id = u.id AND a.evento = 'login') AS ultimo_login,
                   (SELECT COUNT(*) FROM acessos a WHERE a.usuario_id = u.id AND a.evento = 'login') AS logins,
                   (SELECT COUNT(*) FROM visualizacoes v WHERE v.usuario_id = u.id) AS visualizacoes,
                   (SELECT COUNT(DISTINCT publicacao_id) FROM visualizacoes v WHERE v.usuario_id = u.id) AS avisos
            FROM usuarios u ORDER BY u.nome
        `).all();
        const conteudo = csv(
            ['RM', 'Nome', 'Tipo', 'Último login', 'Logins', 'Visualizações de avisos', 'Avisos diferentes vistos'],
            linhas.map((l) => [l.rm, l.nome, l.tipo, dataBR(l.ultimo_login), l.logins, l.visualizacoes, l.avisos]),
        );
        enviarCsv(res, 'usuarios-acessos.csv', conteudo);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao exportar relatório.' });
    }
});

module.exports = router;
