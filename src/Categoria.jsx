import "./styles/home.css";
import "./styles/categoria.css";
import { ConfirmarDialogo } from "./ui/Dialogo.jsx";
import { useAvisos } from "./ui/Avisos.jsx";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import NavBarSuperadmin from "./Nav-bar.jsx";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { useAuth } from "./AuthContext.jsx";
import { ScrollSmoother, ScrollTrigger } from "gsap/all";
import AddMenu from "./AddMenu.jsx";
import { usePublicacaoForm } from "./PublicacaoFormContext.jsx";
import PublicacaoModal from "./PublicacaoModal.jsx";

import { normalizarCategoria, bolinhaDaCategoria, corDaCategoria } from "./categoriaCores.js";
import PainelPublicacoes, { CabecalhoPainel } from "./PainelPublicacoes.jsx";
import iconeCalendario from "./assets/img/icones/calendario.svg";
import CardPublicacao from "./CardPublicacao.jsx";
import Calendario from "./Calendario.jsx";
import { avisarMudancaPublicacoes } from "./eventos.js";
import { obterToken } from "./sessao.js";

gsap.registerPlugin(useGSAP);
gsap.registerPlugin(ScrollSmoother);

const API = "http://localhost:3001";

const CATEGORIAS = {
  geral: "Geral",
  eventos: "Eventos",
  vagas: "Vagas de Emprego",
  coordenacao: "Coordenação", // com cedilha, igual ao nome salvo no banco
  secretaria: "Secretaria",
  anexos: "Anexos",
  professor: "Área do professor",
  funcionarios: "Área dos funcionários",
};

// Quem pode abrir cada área restrita (o servidor também confere)
const DESCRICOES = {
  geral: "Avisos e comunicados para toda a escola.",
  eventos: "Palestras, feiras e atividades que vão acontecer.",
  vagas: "Oportunidades de emprego e estágio.",
  coordenacao: "Comunicados e orientações da coordenação.",
  secretaria: "Prazos, documentos e informações da secretaria.",
  professor: "Avisos exclusivos para professores.",
  funcionarios: "Avisos exclusivos para a equipe de funcionários.",
  anexos: "Todas as publicações que têm data de evento, de qualquer categoria.",
};

const TIPOS_DA_AREA = {
  professor: ["professor", "coordenacao", "administrador", "super_admin"],
  funcionarios: ["coordenacao", "administrador", "super_admin"],
};

// Ajusta os campos da publicação para o formato que o modal espera
// (o campo "lida" agora vem direto do backend)
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

// Ícones de editar/excluir (super admin: todas as publicações · administrador: só as dele)
function AcoesCard({ onEditar, onExcluir }) {
  return (
    <div className="card-acoes">
      <button
        type="button"
        title="Editar"
        aria-label="Editar publicação"
        onClick={onEditar}
      >
        <Pencil size={16} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        title="Excluir"
        aria-label="Excluir publicação"
        onClick={onExcluir}
      >
        <Trash2 size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}

function Categoria() {

  const smootherRef = useRef(null);
  
    // Animações e interações GSAP
    useGSAP(() => {
     
      smootherRef.current = ScrollSmoother.create({
        content: "#smooth-content",
        wrapper: "#smooth-wrapper",
        smooth: 2,
      });
    }, []);
  
  const { slug } = useParams();
  const { abrirEdicao, abrirNova, versao, ultimoSalvo } = usePublicacaoForm();
  const versaoAnterior = useRef(versao);
  const { user, logout, token: tokenContexto } = useAuth();

  // Token do login: tenta o do AuthContext e, se não houver, o do localStorage
  const token = tokenContexto ?? obterToken();

  // Só administrador e super admin podem ver o botão de adicionar publicação
  const ehPublicador = ["administrador", "super_admin"].includes(user?.tipo);

  // Super admin edita/exclui qualquer publicação; administrador só as que ele mesmo criou
  // (o backend confere de novo: aqui só decide se os botões aparecem)
  const podeGerenciar = (pub) =>
    user?.tipo === "super_admin" ||
    (user?.tipo === "administrador" && Number(pub.autor_id) === Number(user.id));

  // área restrita sem permissão: tratada como página inexistente (o servidor também bloqueia)
  const nomeCategoria =
    TIPOS_DA_AREA[slug] && !TIPOS_DA_AREA[slug].includes(user?.tipo) ? undefined : CATEGORIAS[slug];
  // "Anexos" é o calendário: mostra todas as publicações que têm data, de qualquer categoria
  const ehAnexos = slug === "anexos";

  const [publicacoes, setPublicacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const avisos = useAvisos();

  // Modal: guarda só o id da publicação aberta (assim ela sempre reflete o polling)
  const [abertaId, setAbertaId] = useState(null);

  // Modal de confirmação de exclusão
  const [paraExcluir, setParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState("");

  useEffect(() => {
    if (!nomeCategoria) return;

    // Recarregar depois de salvar no pop-up não deve piscar "Carregando..."
    const recarregando = versaoAnterior.current !== versao;
    versaoAnterior.current = versao;
    if (!recarregando) setCarregando(true);

    const buscarPublicacoes = async () => {
      try {
        const resposta = await fetch(`${API}/publicacoes`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Token inválido ou expirado: volta pro login
        if (resposta.status === 401 || resposta.status === 403) {
          logout?.();
          return;
        }

        const dados = await resposta.json();
        // compara sem depender de acento/maiúscula ("Vagas de emprego" x "Vagas de Emprego")
        const filtradas = ehAnexos
          ? dados.filter((pub) => pub.data_evento)
          : dados.filter(
              (pub) =>
                normalizarCategoria(pub.categoria) ===
                normalizarCategoria(nomeCategoria),
            );
        setPublicacoes(filtradas);
        setErroCarga(false);
      } catch (err) {
        console.error("Erro ao buscar publicações:", err);
        setErroCarga(true);
      } finally {
        setCarregando(false);
      }
    };

    buscarPublicacoes();
    const intervalo = setInterval(buscarPublicacoes, 10000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeCategoria, token, versao, tentativa]);

  const publicacaoAberta = useMemo(() => {
    const pub = publicacoes.find((p) => p.id === abertaId);
    return pub ? prepararPublicacao(pub) : null;
  }, [publicacoes, abertaId]);

  const abrir = (pub) => setAbertaId(pub.id);

  // Abre o pop-up de edição com os dados da publicação
  const editar = (pub) => abrirEdicao(pub);

  // Abre o modal de confirmação
  const excluir = (pub) => {
    setErroExclusao("");
    setParaExcluir(pub);
  };

  // Exclui de verdade depois da confirmação
  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    setExcluindo(true);
    setErroExclusao("");

    try {
      const resposta = await fetch(`${API}/publicacoes/${paraExcluir.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resposta.ok) throw new Error(`Status ${resposta.status}`);

      setPublicacoes((anteriores) =>
        anteriores.filter((p) => p.id !== paraExcluir.id),
      );
      setAbertaId((atual) => (atual === paraExcluir.id ? null : atual));
      setParaExcluir(null);
      avisarMudancaPublicacoes(); // some também das notificações, sem esperar o ciclo de 10 s
    } catch (err) {
      console.error("Erro ao excluir publicação:", err);
      setErroExclusao("Não foi possível excluir. Tente novamente.");
    } finally {
      setExcluindo(false);
    }
  };

  // Atualiza o "lida" de uma publicação no estado local
  const definirLida = useCallback((id, valor) => {
    setPublicacoes((anteriores) =>
      anteriores.map((p) => (p.id === id ? { ...p, lida: valor } : p)),
    );
  }, []);

  // Marca como lida no backend; atualiza a tela na hora e desfaz se der erro
  const marcarComoLida = useCallback(
    async (pub) => {
      definirLida(pub.id, true);
      try {
        const resposta = await fetch(`${API}/publicacoes/${pub.id}/lida`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resposta.ok) throw new Error(`Status ${resposta.status}`);
        avisarMudancaPublicacoes(); // o sino atualiza o contador na hora
      } catch (err) {
        console.error("Erro ao marcar como lida:", err);
        definirLida(pub.id, false);
        avisos.erro("Não foi possível marcar como lida. Tente novamente.");
      }
    },
    [token, definirLida, avisos],
  );

  return (
    <>
      {ehPublicador && <AddMenu />}
      <NavBarSuperadmin />

<svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter
            id="liquid-glass"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.01 0.025"
              numOctaves="200"
              seed="15"
              result="noise"
            />
            <feGaussianBlur in="noise" stdDeviation="2.5" result="softNoise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="softNoise"
              scale="100"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feColorMatrix
              in="displaced"
              type="matrix"
              values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 1 0"
              result="glass"
            />
          </filter>
        </defs>
      </svg>
<div id="smooth-wrapper">
        <div id="smooth-content" style={{ position: "relative", height: "auto" , overflow: "hidden"}}> 

      <main className="categoria-main">
        {!nomeCategoria ? (
          <p className="categoria-status">Categoria não encontrada.</p>
        ) : (
          <>
            {ehAnexos ? (
              <>
                <CabecalhoPainel
                  titulo={nomeCategoria}
                  descricao={
                    DESCRICOES.anexos +
                    (ehPublicador ? " Para publicar com data, escolha um dia no calendário." : "")
                  }
                  marca={<img src={iconeCalendario} alt="" />}
                />

                {carregando ? (
                  <p className="categoria-status">Carregando publicações...</p>
                ) : (
                  <Calendario
                    publicacoes={publicacoes}
                    onAbrir={abrir}
                    podeCriar={ehPublicador}
                    onNova={(dataEvento) => abrirNova({ dataEvento })}
                    foco={ultimoSalvo}
                    renderAcoes={(pub) =>
                      podeGerenciar(pub) && (
                        <AcoesCard
                          onEditar={() => editar(pub)}
                          onExcluir={() => excluir(pub)}
                        />
                      )
                    }
                  />
                )}
              </>
            ) : (
              <PainelPublicacoes
                titulo={nomeCategoria}
                descricao={DESCRICOES[slug]}
                marca={<img src={bolinhaDaCategoria(nomeCategoria)} alt="" />}
                cor={corDaCategoria(nomeCategoria)}
                publicacoes={publicacoes}
                carregando={carregando}
                erro={erroCarga}
                onTentarNovamente={() => setTentativa((n) => n + 1)}
                textoVazio="Nenhuma publicação nesta categoria."
                renderCard={(pub) => (
                  <CardPublicacao
                    key={pub.id}
                    pub={pub}
                    onAbrir={abrir}
                    acoes={
                      podeGerenciar(pub) && (
                        <AcoesCard
                          onEditar={() => editar(pub)}
                          onExcluir={() => excluir(pub)}
                        />
                      )
                    }
                  />
                )}
              />
            )}
          </>
        )}
      </main>


</div>
        </div>


      <PublicacaoModal
        publicacao={publicacaoAberta}
        onClose={() => setAbertaId(null)}
        onMarcarLida={["comum", "professor", "coordenacao"].includes(user?.tipo) ? marcarComoLida : undefined}
      />

      {paraExcluir && (
        <ConfirmarDialogo
          titulo="Excluir publicação?"
          texto={
            <>
              <strong>{paraExcluir.titulo}</strong> será removida para todos os
              usuários. Essa ação não pode ser desfeita.
            </>
          }
          rotuloConfirmar="Excluir"
          rotuloCarregando="Excluindo..."
          carregando={excluindo}
          erro={erroExclusao}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
    </>
  );
}

export default Categoria;