import { bolinhaDaCategoria } from "./categoriaCores.js";
import { formatarDataPublicacao } from "./datas.js";

const API = "http://localhost:3001";

// URL completa da imagem da publicação (ou null)
export function urlImagem(pub) {
  const img = pub.imagem_url;
  if (!img) return null;
  return img.startsWith("http") ? img : `${API}${img}`;
}

// Ajusta os campos da publicação para o pop-up de visualização
export function prepararPublicacao(pub) {
  return {
    ...pub,
    imagem_url: urlImagem(pub),
    conteudo: pub.conteudo ?? pub.descricao ?? pub.texto ?? "",
    created_at: pub.criado_em,
    lida: Boolean(pub.lida),
  };
}

// Card de publicação usado nas páginas de categoria e no resumo semanal:
// imagem, bolinhas da categoria + data, título, categoria e botão "Ver publicação".
// `acoes` é um slot opcional (ícones de editar/excluir).
export default function CardPublicacao({ pub, onAbrir, acoes = null }) {
  const imagem = urlImagem(pub);

  return (
    <div className="categoria-card">
      {acoes}
      <div className="categoria-card-img">
        {imagem && <img src={imagem} alt={pub.titulo} loading="lazy" />}
      </div>
      <div className="categoria-card-info">
        <div className="data-img">
          <img src={bolinhaDaCategoria(pub.categoria)} alt="" />
          <span className="categoria-card-data">
            {formatarDataPublicacao(pub)}
          </span>
        </div>

        <div className="fds">
          <h3 className="categoria-card-titulo">{pub.titulo}</h3>
          <p className="categoria-card-categoria">{pub.categoria}</p>
        </div>

        <button
          type="button"
          className="categoria-card-btn"
          onClick={() => onAbrir(pub)}
        >
          Ver publicação
        </button>
      </div>
    </div>
  );
}
