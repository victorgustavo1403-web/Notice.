import { obterToken } from "./sessao.js";

const API = "http://localhost:3001";

// Registra navegação para o relatório de acessos. Se falhar, não atrapalha o usuário.
export function registrarEvento(evento, referencia) {
  const token = obterToken();
  if (!token) return;
  fetch(`${API}/eventos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ evento, referencia }),
  }).catch(() => {});
}

// Alguém abriu um aviso. Visitantes sem login (agenda pública) não contam.
export function registrarVisualizacao(publicacaoId) {
  const token = obterToken();
  if (!token) return;
  fetch(`${API}/publicacoes/${publicacaoId}/visualizacao`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    keepalive: true,
  }).catch(() => {});
}
