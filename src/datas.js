// Utilitários de data compartilhados.
//
// O SQLite grava `criado_em` com datetime('now'), que é UTC e vem sem fuso
// ("2026-10-11 23:30:00"). Se isso for passado direto para `new Date()`, o
// navegador trata como horário LOCAL, e uma publicação feita à noite no Brasil
// aparece com a data de amanhã. Aqui a data é interpretada como UTC e exibida
// no fuso do usuário.

// Data em que a publicação foi criada (Date) ou null
export function dataPublicacao(pub) {
  const valor = pub?.criado_em ?? pub?.created_at;
  if (!valor) return null;

  const texto = String(valor);
  const semFuso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(texto);
  const data = new Date(semFuso ? `${texto.replace(" ", "T")}Z` : texto);

  return isNaN(data) ? null : data;
}

// "11/10/2026" — data em que a publicação foi criada
export function formatarDataPublicacao(pub) {
  const data = dataPublicacao(pub);
  return data ? data.toLocaleDateString("pt-BR") : "";
}

// 'YYYY-MM-DD' (data do evento) -> Date local, sem deslocar um dia por causa do fuso
export function dataDoEvento(valor) {
  if (!valor) return null;
  const data = new Date(`${String(valor).slice(0, 10)}T00:00:00`);
  return isNaN(data) ? null : data;
}

// "15 de outubro de 2026"
export function formatarDataEvento(valor) {
  const data = dataDoEvento(valor);
  return data
    ? data.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : "";
}

// Date local -> 'YYYY-MM-DD' (sem deslocar o dia por causa do fuso)
export function chaveData(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Hoje, no relógio do usuário: 'YYYY-MM-DD'
export function hojeChave() {
  return chaveData(new Date());
}
