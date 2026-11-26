const { db } = require('./db');
const { podeVerCategoria } = require('./acesso');

/**
 * Lista todas as publicações, mais recentes primeiro,
 * já trazendo o nome da categoria e se o usuário já leu.
 */
function listarPublicacoes(usuarioId, tipo) {
    return db.prepare(`
        SELECT
            publicacoes.id,
            publicacoes.titulo,
            publicacoes.conteudo,
            publicacoes.imagem_url,
            publicacoes.data_evento,
            publicacoes.publico,
            publicacoes.criado_em,
            publicacoes.autor_id,
            categorias.nome AS categoria,
            EXISTS (
                SELECT 1 FROM leituras
                WHERE leituras.publicacao_id = publicacoes.id
                  AND leituras.usuario_id = ?
            ) AS lida,
            meu.id AS cv_id, meu.nome_original AS cv_nome, meu.tamanho AS cv_tamanho, meu.enviado_em AS cv_enviado_em,
            (SELECT COUNT(*) FROM curriculos WHERE curriculos.publicacao_id = publicacoes.id) AS total_curriculos
        FROM publicacoes
        LEFT JOIN categorias ON categorias.id = publicacoes.categoria_id
        LEFT JOIN curriculos AS meu ON meu.publicacao_id = publicacoes.id AND meu.usuario_id = ?
        ORDER BY publicacoes.criado_em DESC
    `).all(usuarioId, usuarioId)
        .filter((p) => podeVerCategoria(tipo, p.categoria)) // áreas restritas só para quem tem acesso
        .map(({ cv_id, cv_nome, cv_tamanho, cv_enviado_em, total_curriculos, ...p }) => ({
            ...p,
            lida: Boolean(p.lida),
            publico: Boolean(p.publico),
            // currículo que o próprio aluno enviou para esta vaga (ou null)
            meu_curriculo: cv_id ? { id: cv_id, nome_original: cv_nome, tamanho: cv_tamanho, enviado_em: cv_enviado_em } : null,
            // quantos currículos a vaga recebeu: só administradores enxergam
            ...(['administrador', 'super_admin'].includes(tipo) ? { total_curriculos } : {}),
        }));
}

/**
 * Agenda pública (sem login): só eventos marcados como públicos, com data,
 * fora das áreas restritas e fora de Anexos. Datas muito antigas ficam de fora.
 */
function listarEventosPublicos() {
    return db.prepare(`
        SELECT
            publicacoes.id,
            publicacoes.titulo,
            publicacoes.conteudo,
            publicacoes.imagem_url,
            publicacoes.data_evento,
            publicacoes.criado_em,
            categorias.nome AS categoria
        FROM publicacoes
        LEFT JOIN categorias ON categorias.id = publicacoes.categoria_id
        WHERE publicacoes.publico = 1
          AND publicacoes.data_evento IS NOT NULL
          AND publicacoes.data_evento >= date('now', '-60 days')
        ORDER BY publicacoes.data_evento ASC, publicacoes.id ASC
    `).all().filter((p) => podeVerCategoria('comum', p.categoria));
}

/**
 * Mural da TV do corredor (sem login). Só entra o que já é aberto a todos:
 * áreas restritas (professor, funcionários) nunca aparecem. Devolve eventos que
 * ainda vão acontecer (mais próximos primeiro) e as publicações mais recentes,
 * sem repetir, com a descrição já convertida em texto simples.
 */
function textoSimples(html, limite = 320) {
    const texto = String(html ?? '')
        .replace(/<\/(p|li|h\d)>/gi, ' ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    if (texto.length <= limite) return texto;
    return texto.slice(0, limite).replace(/\s+\S*$/, '') + '…';
}

function listarAvisosTv({ hoje, limiteRecentes = 10, limiteEventos = 6 }) {
    const linhas = db.prepare(`
        SELECT
            publicacoes.id,
            publicacoes.titulo,
            publicacoes.conteudo,
            publicacoes.imagem_url,
            publicacoes.data_evento,
            publicacoes.criado_em,
            categorias.nome AS categoria
        FROM publicacoes
        LEFT JOIN categorias ON categorias.id = publicacoes.categoria_id
        ORDER BY publicacoes.criado_em DESC, publicacoes.id DESC
        LIMIT 200
    `).all().filter((p) => podeVerCategoria('comum', p.categoria));

    const formatar = (p) => ({
        id: p.id,
        titulo: p.titulo,
        resumo: textoSimples(p.conteudo),
        categoria: p.categoria,
        imagem_url: p.imagem_url,
        data_evento: p.data_evento,
        criado_em: p.criado_em,
    });

    const eventos = linhas
        .filter((p) => p.data_evento && p.data_evento >= hoje)
        .sort((a, b) => a.data_evento.localeCompare(b.data_evento) || a.id - b.id)
        .slice(0, limiteEventos);
    const usados = new Set(eventos.map((p) => p.id));
    const recentes = linhas.filter((p) => !usados.has(p.id)).slice(0, limiteRecentes);

    return { eventos: eventos.map(formatar), recentes: recentes.map(formatar) };
}

// criarPublicacao continua igual
function criarPublicacao({ titulo, conteudo, categoria_id, autor_id, imagem_url, data_evento, publico }) {
    const insert = db.prepare(`
        INSERT INTO publicacoes (titulo, conteudo, categoria_id, autor_id, imagem_url, data_evento, publico)
        VALUES (@titulo, @conteudo, @categoria_id, @autor_id, @imagem_url, @data_evento, @publico)
    `);
    const resultado = insert.run({
        titulo,
        conteudo,
        categoria_id,
        autor_id,
        imagem_url: imagem_url || null,
        data_evento: data_evento || null,
        publico: publico ? 1 : 0
    });
    return resultado.lastInsertRowid;
}

function marcarLida(usuarioId, publicacaoId) {
    db.prepare(
        'INSERT OR IGNORE INTO leituras (usuario_id, publicacao_id) VALUES (?, ?)'
    ).run(usuarioId, publicacaoId);
}

function desmarcarLida(usuarioId, publicacaoId) {
    db.prepare(
        'DELETE FROM leituras WHERE usuario_id = ? AND publicacao_id = ?'
    ).run(usuarioId, publicacaoId);
}

module.exports = { listarPublicacoes, listarEventosPublicos, listarAvisosTv, criarPublicacao, marcarLida, desmarcarLida };