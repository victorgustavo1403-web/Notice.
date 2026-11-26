import bolinhasPadrao from "./assets/img/bolinhas.png";
import geral from "./assets/img/bolinhas-categorias/geral.png";
import eventos from "./assets/img/bolinhas-categorias/eventos.png";
import vagas from "./assets/img/bolinhas-categorias/vagas-de-emprego.png";
import coordenacao from "./assets/img/bolinhas-categorias/coordenacao.png";
import secretaria from "./assets/img/bolinhas-categorias/secretaria.png";
import professor from "./assets/img/bolinhas-categorias/professor.png";
import funcionarios from "./assets/img/bolinhas-categorias/funcionarios.png";

// Cor de cada categoria, representada pelas "bolinhas" dos cards:
// Azul = Geral · Vermelho = Eventos · Amarelo = Vagas de Emprego
// Verde = Coordenação · Laranja = Secretaria
const BOLINHAS = {
  geral,
  eventos,
  "vagas de emprego": vagas,
  coordenacao,
  secretaria,
  "area do professor": professor,
  "area dos funcionarios": funcionarios,
};

// "Coordenação", "coordenacão", "COORDENACAO" -> "coordenacao"
export const normalizarCategoria = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

// Bolinhas da categoria. Categorias sem cor definida (ex.: Anexos)
// continuam com as bolinhas coloridas padrão do sistema.
export function bolinhaDaCategoria(categoria) {
  const nome = categoria?.nome ?? categoria;
  return BOLINHAS[normalizarCategoria(nome)] ?? bolinhasPadrao;
}

// Cor de cada categoria (a mesma das bolinhas)
const COR = {
  geral: "#0064af",
  eventos: "#f54526",
  "vagas de emprego": "#edbe03",
  coordenacao: "#77b502",
  secretaria: "#fd8552",
  "area do professor": "#7b3fe4", // roxo
  "area dos funcionarios": "#8d8d92", // cinza
};
export function corDaCategoria(categoria) {
  const nome = categoria?.nome ?? categoria;
  return COR[normalizarCategoria(nome)] ?? null;
}

// Inicial usada no nome das imagens padrão (G1.png, E3.png, V2.png, C5.png, S4.png)
const LETRA = {
  geral: "G",
  eventos: "E",
  "vagas de emprego": "V",
  coordenacao: "C",
  secretaria: "S",
  "area do professor": "P",
  "area dos funcionarios": "F",
};
export function letraDaCategoria(categoria) {
  const nome = categoria?.nome ?? categoria;
  return LETRA[normalizarCategoria(nome)] ?? null;
}

// Primeiro nome do usuário logado, para a mensagem de boas-vindas ("Marcelo Antunes" -> "Marcelo")
export function primeiroNome(usuario) {
  const nome = String(usuario?.nome ?? "").trim();
  return nome.split(/\s+/)[0] || "";
}
