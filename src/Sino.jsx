import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import { useAuth } from "./AuthContext.jsx";
import PublicacaoModal from "./PublicacaoModal.jsx";
import { dataPublicacao, formatarDataPublicacao } from "./datas.js";
import { EVENTO_PUBLICACOES, avisarMudancaPublicacoes } from "./eventos.js";
import { obterToken } from "./sessao.js";
import { bolinhaDaCategoria } from "./categoriaCores.js";
import { useAvisos } from "./ui/Avisos.jsx";

const API = "http://localhost:3001";

// Mesmo ajuste de campos que o Categoria.jsx faz para o modal
function prepararPublicacao(pub) {
  const img = pub.imagem_url;
  return {
    ...pub,
    imagem_url: img && !img.startsWith("http") ? `${API}${img}` : img,
    conteudo: pub.conteudo ?? pub.descricao ?? pub.texto ?? "",
    created_at: pub.criado_em,
    lida: Boolean(pub.lida),
  };
}

export default function Sino() {
  const { token: tokenContexto } = useAuth();
  const token = tokenContexto ?? obterToken();

  const [publicacoes, setPublicacoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState({ top: 0, right: 0 });
  const [abertaId, setAbertaId] = useState(null);
  const avisos = useAvisos();

  const botaoRef = useRef(null);
  const caixaRef = useRef(null);

  // Busca as publicações (substitui a lista inteira: o que foi excluído some)
  const buscar = useCallback(async () => {
    if (!token) return;
    try {
      const resposta = await fetch(`${API}/publicacoes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resposta.ok) return;
      setPublicacoes(await resposta.json());
    } catch (err) {
      console.error("Erro ao buscar notificações:", err);
    }
  }, [token]);

  // A cada 10s, e também na hora quando: a aba volta a ficar visível,
  // outra tela avisa que algo mudou (excluída, lida, nova...) ou o sino é aberto.
  useEffect(() => {
    if (!token) return;

    buscar();
    const intervalo = setInterval(buscar, 10000);

    const aoVoltar = () => {
      if (document.visibilityState === "visible") buscar();
    };
    window.addEventListener(EVENTO_PUBLICACOES, buscar);
    window.addEventListener("focus", buscar);
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener(EVENTO_PUBLICACOES, buscar);
      window.removeEventListener("focus", buscar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [token, buscar]);

  // Fecha a caixinha ao clicar fora
  useEffect(() => {
    if (!aberto) return;

    const aoClicar = (e) => {
      if (botaoRef.current?.contains(e.target)) return;
      if (caixaRef.current?.contains(e.target)) return;
      setAberto(false);
    };

    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, [aberto]);

  const naoLidas = useMemo(
    () =>
      publicacoes
        .filter((p) => !p.lida)
        .sort((a, b) => (dataPublicacao(b) ?? 0) - (dataPublicacao(a) ?? 0)),
    [publicacoes],
  );

  // Atualiza o "lida" no estado local
  const definirLida = useCallback((id, valor) => {
    setPublicacoes((anteriores) =>
      anteriores.map((p) => (p.id === id ? { ...p, lida: valor } : p)),
    );
  }, []);

  // Marca como lida no backend (atualiza na hora e desfaz se der erro)
  const marcarComoLida = useCallback(
    async (pub) => {
      definirLida(pub.id, true);
      try {
        const resposta = await fetch(`${API}/publicacoes/${pub.id}/lida`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resposta.ok) throw new Error(`Status ${resposta.status}`);
        avisarMudancaPublicacoes(); // outras telas (e este sino) sincronizam
      } catch (err) {
        console.error("Erro ao marcar como lida:", err);
        definirLida(pub.id, false);
        avisos.erro("Não foi possível marcar como lida. Tente novamente.");
      }
    },
    [token, definirLida, avisos],
  );

  const alternar = () => {
    if (!aberto && botaoRef.current) {
      const r = botaoRef.current.getBoundingClientRect();
      setPosicao({
        top: r.bottom + 10,
        right: Math.max(12, window.innerWidth - r.right),
      });
    }
    if (!aberto) buscar(); // ao abrir, já mostra a lista atualizada
    setAberto((a) => !a);
  };

  // Abrir um aviso pelo sino = acessá-lo: ele conta como lido e o contador diminui na hora
  const abrirPublicacao = (pub) => {
    setAberto(false);
    setAbertaId(pub.id);
    if (!pub.lida) marcarComoLida(pub);
  };

  const publicacaoAberta = useMemo(() => {
    const pub = publicacoes.find((p) => p.id === abertaId);
    return pub ? prepararPublicacao(pub) : null;
  }, [publicacoes, abertaId]);

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        className="sino-botao"
        title="Notificações"
        aria-label={`Notificações${naoLidas.length ? `, ${naoLidas.length} não lidas` : ""}`}
        onClick={alternar}
      >
        <Bell size={18} strokeWidth={1.75} />
        {naoLidas.length > 0 && (
          <span className="sino-badge">
            {naoLidas.length > 9 ? "9+" : naoLidas.length}
          </span>
        )}
      </button>

      {aberto &&
        createPortal(
          <div
            ref={caixaRef}
            className="sino-caixa"
            style={{ top: posicao.top, right: posicao.right }}
          >
            <h4 className="sino-titulo">Novas publicações</h4>

            {naoLidas.length === 0 ? (
              <p className="sino-vazio">Você não tem publicações novas.</p>
            ) : (
              naoLidas.slice(0, 8).map((pub) => (
                <button
                  key={pub.id}
                  type="button"
                  className="sino-item"
                  onClick={() => abrirPublicacao(pub)}
                >
                  <span className="sino-item-topo">
                    <img src={bolinhaDaCategoria(pub.categoria)} alt="" />
                    <span className="sino-item-data">{formatarDataPublicacao(pub)}</span>
                  </span>
                  <span className="sino-item-titulo">{pub.titulo}</span>
                  <span className="sino-item-info">{pub.categoria}</span>
                </button>
              ))
            )}

            {naoLidas.length > 8 && (
              <p className="sino-vazio">+ {naoLidas.length - 8} publicações não lidas</p>
            )}
          </div>,
          document.body,
        )}

      {/* Modal no body para não ser afetado pelos efeitos da navbar */}
      {createPortal(
        <PublicacaoModal
          publicacao={publicacaoAberta}
          onClose={() => setAbertaId(null)}
          onMarcarLida={marcarComoLida}
        />,
        document.body,
      )}
    </>
  );
}