// Aviso entre componentes: "as publicações mudaram" (criada, editada, excluída ou lida).
// O sino de notificações escuta isso e atualiza na hora, sem esperar o ciclo de 10 s.
export const EVENTO_PUBLICACOES = "notice:publicacoes-mudaram";

export function avisarMudancaPublicacoes() {
  window.dispatchEvent(new Event(EVENTO_PUBLICACOES));
}
