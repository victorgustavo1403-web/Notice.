// Currículos nas vagas de emprego: chamadas ao servidor e utilitários.
import { obterToken } from "./sessao.js";
import { normalizarCategoria } from "./categoriaCores.js";

const API = "http://localhost:3001";
export const TAMANHO_MAX = 5 * 1024 * 1024;
export const MSG_SERVIDOR = "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";

export const ehVaga = (categoria) => normalizarCategoria(categoria?.nome ?? categoria ?? "").startsWith("vagas");

export function formatarTamanho(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

// datas do SQLite vêm em UTC ("AAAA-MM-DD HH:MM:SS")
export function formatarEnvio(valor) {
  if (!valor) return "";
  const d = new Date(`${valor.replace(" ", "T")}Z`);
  if (isNaN(d)) return "";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Confere o arquivo antes de enviar; devolve a mensagem de erro ou ""
export function erroDoArquivo(arquivo) {
  if (!arquivo) return "Escolha o arquivo do currículo.";
  const pdf = arquivo.type === "application/pdf" || /\.pdf$/i.test(arquivo.name);
  if (!pdf) return "Envie o currículo em PDF.";
  if (arquivo.size > TAMANHO_MAX) return "O arquivo passa de 5 MB. Envie um PDF menor.";
  return "";
}

async function pedir(caminho, opcoes = {}) {
  let resp;
  try {
    resp = await fetch(`${API}${caminho}`, {
      ...opcoes,
      headers: { ...(opcoes.headers || {}), Authorization: `Bearer ${obterToken()}` },
    });
  } catch {
    throw new Error(MSG_SERVIDOR);
  }
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || "Algo deu errado. Tente novamente.");
  return dados;
}

export function enviarCurriculo(publicacaoId, arquivo, mensagem) {
  const corpo = new FormData();
  corpo.append("curriculo", arquivo);
  if (mensagem?.trim()) corpo.append("mensagem", mensagem.trim());
  return pedir(`/publicacoes/${publicacaoId}/curriculo`, { method: "POST", body: corpo });
}

export const retirarCurriculo = (publicacaoId) => pedir(`/publicacoes/${publicacaoId}/curriculo`, { method: "DELETE" });
export const listarCurriculos = () => pedir("/curriculos");
export const descartarCurriculo = (id) => pedir(`/curriculos/${id}`, { method: "DELETE" });

// Baixa o PDF com o token (a pasta dos currículos não é pública).
// modo "abrir": mostra numa nova aba · modo "baixar": salva com o nome original
export async function abrirCurriculo(id, nome = "curriculo.pdf", modo = "abrir") {
  // a aba precisa ser aberta já no clique, senão o navegador bloqueia como pop-up
  const aba = modo === "abrir" ? window.open("", "_blank") : null;
  try {
    let resp;
    try {
      resp = await fetch(`${API}/curriculos/${id}/arquivo`, { headers: { Authorization: `Bearer ${obterToken()}` } });
    } catch {
      throw new Error(MSG_SERVIDOR);
    }
    if (!resp.ok) {
      const dados = await resp.json().catch(() => ({}));
      throw new Error(dados.erro || "Não foi possível abrir o currículo.");
    }
    const url = URL.createObjectURL(await resp.blob());
    if (aba) {
      aba.location.href = url;
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (erro) {
    aba?.close();
    throw erro;
  }
}

// Guarda o que o aluno acabou de enviar/retirar, para o pop-up mostrar o estado certo
// mesmo antes da lista de publicações ser recarregada.
const recentes = new Map();
export const lembrarCurriculo = (publicacaoId, curriculo) => recentes.set(publicacaoId, curriculo);
export const curriculoAtual = (publicacao) =>
  recentes.has(publicacao.id) ? recentes.get(publicacao.id) : publicacao.meu_curriculo ?? null;
