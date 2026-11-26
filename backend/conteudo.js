// Tratamento do texto das publicações (descrição formatada vinda do editor).
//
// O editor envia HTML. Como esse HTML é mostrado para todos os usuários, ele é SEMPRE
// limpo aqui no servidor antes de ser salvo: só ficam as tags de formatação simples
// (negrito, itálico, sublinhado, tachado, listas, links e alinhamento do parágrafo).
// Scripts, estilos, fontes, tamanhos, imagens e qualquer outra coisa são descartados.
const sanitizeHtml = require('sanitize-html');

const LIMITE_HTML = 20000; // caracteres, já com as tags

const OPCOES = {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a'],
    allowedAttributes: {
        a: ['href', 'target', 'rel'],
        p: ['style'],
        li: ['style'],
    },
    // o único estilo permitido é o alinhamento do texto
    allowedStyles: {
        '*': { 'text-align': [/^(left|right|center|justify)$/] },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
        b: 'strong',
        i: 'em',
        strike: 's',
        // links sempre abrem em outra aba e sem passar informação para o site de destino
        a: (tag, attribs) => ({
            tagName: 'a',
            attribs: { href: attribs.href, target: '_blank', rel: 'noopener noreferrer nofollow' },
        }),
    },
};

const escapar = (t) =>
    String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const TEM_TAG = /<\/?(p|br|strong|b|em|i|u|s|strike|ul|ol|li|a)\b/i;

// Aceita HTML do editor ou texto simples (ex.: enviado direto pela API) e devolve HTML limpo
function sanitizarConteudo(entrada) {
    const texto = String(entrada ?? '').trim();
    if (!texto) return '';

    const html = TEM_TAG.test(texto)
        ? texto
        : texto
              .split(/\r?\n/)
              .map((linha) => `<p>${escapar(linha)}</p>`)
              .join('');

    return sanitizeHtml(html, OPCOES).trim();
}

// Texto puro (sem tags), para validar "tem conteúdo?" e para a prévia do e-mail
function textoPuro(html) {
    const separado = String(html ?? '').replace(/<\/(p|li)>|<br\s*\/?>/gi, ' ');
    const semTags = sanitizeHtml(separado, { allowedTags: [], allowedAttributes: {} });
    return semTags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

const temTexto = (html) => textoPuro(html).length > 0;
const longoDemais = (html) => String(html).length > LIMITE_HTML;

module.exports = { sanitizarConteudo, textoPuro, temTexto, longoDemais };
