import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { bolinhaDaCategoria } from "./categoriaCores.js";
import { formatarDataPublicacao, formatarDataEvento } from "./datas.js";
import ConteudoPublicacao from "./ConteudoPublicacao.jsx";
import Candidatura from "./ui/Candidatura.jsx";
import { ehVaga } from "./curriculos.js";
import { registrarVisualizacao } from "./registrarEvento.js";
import "./styles/PublicacaoModal.css";

export default function PublicacaoModal({ publicacao, onClose, onMarcarLida }) {
  const [slide, setSlide] = useState(0);
  const [fechando, setFechando] = useState(false);

  // Imagens: aceita um array (imagens) ou só uma (imagem_url)
  const imagens = publicacao?.imagens?.length
    ? publicacao.imagens
    : publicacao?.imagem_url
    ? [publicacao.imagem_url]
    : [];

  const fechar = () => {
    setFechando(true);
    setTimeout(onClose, 180); // espera a animação de saída
  };

  // Esc fecha, setas trocam de imagem
  useEffect(() => {
    if (!publicacao) return;
    const onKey = (e) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowRight") setSlide((s) => Math.min(s + 1, imagens.length - 1));
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [publicacao, imagens.length]);

  // Trava o scroll da página enquanto o modal está aberto
  useEffect(() => {
    if (!publicacao) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [publicacao]);

  // A cada abertura/troca de publicação: volta ao primeiro slide e zera o estado
  // de "fechando" (o componente continua montado entre uma abertura e outra)
  useEffect(() => {
    setSlide(0);
    setFechando(false);
    // conta a visualização para o relatório (só com login; o servidor ignora repetições próximas)
    if (publicacao?.id) registrarVisualizacao(publicacao.id);
  }, [publicacao?.id]);

  if (!publicacao) return null;

  return createPortal(
    <div
      className={`pubmodal-overlay ${fechando ? "saindo" : ""}`}
      onClick={fechar}
      role="presentation"
    >
      <div
        className="pubmodal-wrap"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pubmodal-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Card principal ===== */}
        <article className="pubmodal-card">
          <div className="pubmodal-media">
            {imagens.length > 0 && (
              <img src={imagens[slide]} alt={publicacao.titulo} />
            )}
            <button className="pubmodal-fechar" onClick={fechar} aria-label="Fechar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </div>

          {/* Mesmo layout dos cards: bolinhas da categoria à esquerda, data à direita */}
          <div className="pubmodal-meta">
            <img
              src={bolinhaDaCategoria(publicacao.categoria)}
              alt=""
              className="pubmodal-bolinhas"
            />

            {imagens.length > 1 && (
              <div className="pubmodal-dots">
                {imagens.map((_, i) => (
                  <button
                    key={i}
                    className={i === slide ? "ativo" : ""}
                    onClick={() => setSlide(i)}
                    aria-label={`Imagem ${i + 1}`}
                  />
                ))}
              </div>
            )}

            <span className="pubmodal-data">
              {formatarDataPublicacao(publicacao)}
            </span>
          </div>

          <header className="pubmodal-header">
            <h2 id="pubmodal-titulo">{publicacao.titulo}</h2>
            <span className="pubmodal-categoria">
              {publicacao.categoria?.nome || publicacao.categoria}
            </span>
          </header>

          {onMarcarLida && (
            <button
              className={`pubmodal-lida ${publicacao.lida ? "marcada" : ""}`}
              onClick={() => onMarcarLida?.(publicacao)}
              disabled={publicacao.lida}
            >
              {publicacao.lida ? "Lida" : "Marcar como lida"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}
        </article>

        {/* ===== Descrição ao lado, com scroll próprio ===== */}
        {(publicacao.conteudo || publicacao.data_evento || ehVaga(publicacao.categoria)) && (
          <aside className="pubmodal-descricao">
            <div className="pubmodal-descricao-scroll">
              {/* vagas de emprego: aluno envia o currículo; administrador vê quantos chegaram */}
              <Candidatura publicacao={publicacao} />
              {publicacao.data_evento && (
                <div className="pubmodal-evento">
                  <span className="pubmodal-descricao-rotulo">Data do evento</span>
                  <span className="pubmodal-evento-valor">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
                      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
                    </svg>
                    {formatarDataEvento(publicacao.data_evento)}
                  </span>
                </div>
              )}
              {publicacao.conteudo && (
                <>
                  <span className="pubmodal-descricao-rotulo">Descrição</span>
                  <ConteudoPublicacao conteudo={publicacao.conteudo} />
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>,
    document.body
  );
}