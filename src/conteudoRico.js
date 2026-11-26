import DOMPurify from "dompurify";

// Descrição das publicações: HTML do editor (novas) ou texto simples (publicações antigas).

const TEM_TAG = /<\/?(p|br|strong|b|em|i|u|s|strike|ul|ol|li|a)\b/i;
export const ehHtml = (conteudo) => TEM_TAG.test(String(conteudo ?? ""));

const escapar = (t) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Texto simples -> HTML (um <p> por linha) para abrir no editor
export function paraHtmlEditor(conteudo) {
  const texto = String(conteudo ?? "");
  if (!texto.trim()) return "";
  if (ehHtml(texto)) return texto;
  return texto
    .split(/\r?\n/)
    .map((linha) => `<p>${escapar(linha)}</p>`)
    .join("");
}

// Defesa extra ao exibir (o servidor já limpa ao salvar): só formatação simples,
// e o único estilo aceito é o alinhamento do parágrafo.
DOMPurify.addHook("afterSanitizeAttributes", (no) => {
  if (no.hasAttribute && no.hasAttribute("style")) {
    const m = no.getAttribute("style").match(/text-align:\s*(left|right|center|justify)/i);
    if (m) no.setAttribute("style", `text-align:${m[1].toLowerCase()}`);
    else no.removeAttribute("style");
  }
  if (no.tagName === "A") {
    no.setAttribute("target", "_blank");
    no.setAttribute("rel", "noopener noreferrer nofollow");
  }
});

export function sanitizarParaExibir(html) {
  return DOMPurify.sanitize(String(html ?? ""), {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href", "target", "rel", "style"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  });
}

// Texto puro de um HTML (para saber se a descrição está vazia)
export function textoPuroDe(html) {
  const div = document.createElement("div");
  div.innerHTML = sanitizarParaExibir(html);
  return (div.textContent ?? "").trim();
}
