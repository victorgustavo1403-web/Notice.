import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import CardPublicacao from "./CardPublicacao.jsx";
import { normalizarCategoria } from "./categoriaCores.js";
import "./styles/painel-publicacoes.css";

// Cabeçalho das páginas de categoria e do resumo semanal: título, bolinhas/ícone,
// descrição e contador. Também é usado sozinho na página de Anexos (calendário).
export function CabecalhoPainel({ titulo, descricao, marca, cor, contagem, nivel = "h1", children }) {
  const Titulo = nivel;
  return (
    <header className="painel-cabecalho" style={cor ? { "--cor-categoria": cor } : undefined}>
      <div className="painel-cabecalho-texto">
        <div className="painel-titulo-linha">
          <Titulo className="painel-titulo">{titulo}</Titulo>
          {marca}
        </div>
        {descricao && <p className="painel-descricao">{descricao}</p>}
      </div>

      <div className="painel-cabecalho-lado">
        {contagem !== undefined && (
          <span className="painel-contagem">
            <strong>{contagem}</strong> {contagem === 1 ? "publicação" : "publicações"}
          </span>
        )}
        {children}
      </div>
    </header>
  );
}

// Painel de vidro com cabeçalho, busca e a grade de cards.
export default function PainelPublicacoes({
  titulo,
  descricao,
  marca,
  cor,
  nivel,
  publicacoes,
  carregando = false,
  erro = false,
  onTentarNovamente,
  textoVazio = "Nenhuma publicação por aqui ainda.",
  renderCard,
  onAbrir,
}) {
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const termo = normalizarCategoria(busca);
    if (!termo) return publicacoes;
    return publicacoes.filter((p) =>
      normalizarCategoria(`${p.titulo} ${p.categoria}`).includes(termo),
    );
  }, [publicacoes, busca]);

  return (
    <section className="painel-pubs">
      <CabecalhoPainel
        titulo={titulo}
        descricao={descricao}
        marca={marca}
        cor={cor}
        nivel={nivel}
        contagem={carregando ? undefined : publicacoes.length}
      >
        {publicacoes.length > 3 && (
          <label className="painel-busca">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título"
              aria-label="Buscar publicações pelo título"
            />
            {busca && (
              <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca">
                <X size={14} strokeWidth={2.2} />
              </button>
            )}
          </label>
        )}
      </CabecalhoPainel>

      {carregando ? (
        <p className="painel-status" role="status">Carregando publicações...</p>
      ) : erro && publicacoes.length === 0 ? (
        <div className="painel-status" role="alert">
          <p>Não foi possível carregar as publicações.</p>
          {onTentarNovamente && (
            <button type="button" className="btn btn-primario" onClick={onTentarNovamente}>
              Tentar novamente
            </button>
          )}
        </div>
      ) : publicacoes.length === 0 ? (
        <p className="painel-status">{textoVazio}</p>
      ) : filtradas.length === 0 ? (
        <p className="painel-status">Nenhuma publicação encontrada para “{busca}”.</p>
      ) : (
        <div className="painel-grade">
          {filtradas.map((pub) =>
            renderCard ? (
              renderCard(pub)
            ) : (
              <CardPublicacao key={pub.id} pub={pub} onAbrir={onAbrir} />
            ),
          )}
        </div>
      )}
    </section>
  );
}
