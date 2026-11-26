import "./styles/home.css";
import "./styles/home-comum.css";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { gsap } from "gsap";
import NavBarSuperadmin from "./Nav-bar.jsx";
import imghome from "./assets/img/auth.png";
import bolinhas from "./assets/img/bolinhas.png";
import { useGSAP } from "@gsap/react";
import { animateHeroText } from "./animations/hero";
import { ScrollSmoother } from "gsap/all";
import { useAuth } from "./AuthContext.jsx";
import { primeiroNome } from "./categoriaCores.js";
import { useAvisos } from "./ui/Avisos.jsx";
import { registrarEvento } from "./registrarEvento.js"; // NOVO
import { dataPublicacao } from "./datas.js";
import { obterToken } from "./sessao.js";
import { prepararPublicacao } from "./CardPublicacao.jsx";
import PainelPublicacoes from "./PainelPublicacoes.jsx";
import PublicacaoModal from "./PublicacaoModal.jsx";
import { avisarMudancaPublicacoes } from "./eventos.js";

gsap.registerPlugin(useGSAP);
gsap.registerPlugin(ScrollSmoother);

const API = "http://localhost:3001";
const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

function HomeComum() {
  const smootherRef = useRef(null);
  const { user, logout, token: tokenContexto } = useAuth();

  // Token do login: tenta o do AuthContext e, se não houver, o do localStorage
  const token = tokenContexto ?? obterToken();

  const [publicacoes, setPublicacoes] = useState([]);
  const [carregandoPubs, setCarregandoPubs] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const avisos = useAvisos();

  // Pop-up: guarda só o id, assim ele sempre reflete a lista atualizada
  const [abertaId, setAbertaId] = useState(null);

  // NOVO: registra que o usuário abriu a home (relatório de acessos)
  useEffect(() => {
    registrarEvento("ver_home");
  }, []);

  useEffect(() => {
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
        // Só aceita lista; se a API devolver erro, não quebra a tela
        setPublicacoes(Array.isArray(dados) ? dados : []);
        setErroCarga(false);
      } catch (err) {
        console.error("Erro ao buscar publicações:", err);
        setErroCarga(true);
      } finally {
        setCarregandoPubs(false);
      }
    };

    buscarPublicacoes();
    const intervalo = setInterval(buscarPublicacoes, 10000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tentativa]);

  useGSAP(() => {
    animateHeroText(".homeimg-container");
    animateHeroText(".hometext-container");

    smootherRef.current = ScrollSmoother.create({
      content: "#smooth-content",
      wrapper: "#smooth-wrapper",
      smooth: 2,
    });

    return () => {
      smootherRef.current?.kill();
    };
  }, []);

  const definirLida = useCallback((id, lida) => {
    setPublicacoes((atuais) => atuais.map((p) => (p.id === id ? { ...p, lida } : p)));
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

  const publicacaoAberta = useMemo(() => {
    const pub = publicacoes.find((p) => p.id === abertaId);
    return pub ? prepararPublicacao(pub) : null;
  }, [publicacoes, abertaId]);

  // todas as publicações dos últimos 7 dias (com ou sem data de evento), mais recentes primeiro
  const resumoSemanal = publicacoes
    .filter((p) => {
      const d = dataPublicacao(p);
      return !d || Date.now() - d.getTime() <= SETE_DIAS;
    })
    .sort((a, b) => (dataPublicacao(b) ?? 0) - (dataPublicacao(a) ?? 0) || b.id - a.id);

  return (
    <>
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="liquid-glass" x="-20%" y="-20%" width="140%" height="140%">
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

      <NavBarSuperadmin />

      <div id="smooth-wrapper">
        <div id="smooth-content" style={{ height: "auto", minHeight: "100vh" }}>
          <div className="sla">
            <div className="hometext-container">
              <div className="mds">
                <p>
                  <span className="n-h">N</span>
                  <span className="otice-h">otice</span>
                  <span className="ponto-h">.</span>
                </p>
                <img
                  src={bolinhas}
                  alt="Bolinhas"
                  className="bolinhas"
                  style={{ paddingLeft: "1%" }}
                />
              </div>

              <div className="homeText">
                <div className="testo">
                  <h2 style={{ lineHeight: 1 }}>
                    Seja bem-vindo(a) <br />{" "}
                    <span className="super-admin-h">{primeiroNome(user)}.</span>
                  </h2>
                  <p className="homeText-descricao">
                    Acompanhe os avisos e publicações mais recentes da escola.
                  </p>
                </div>
              </div>
            </div>

            <div className="homeimg-container">
              <img src={imghome} alt="" />
            </div>
          </div>

          <div className="hc-resumo">
            <PainelPublicacoes
              nivel="h2"
              titulo="Resumo semanal"
              descricao="Tudo o que foi publicado nos últimos 7 dias."
              marca={<img src={bolinhas} alt="" />}
              publicacoes={resumoSemanal}
              carregando={carregandoPubs}
              erro={erroCarga}
              onTentarNovamente={() => setTentativa((n) => n + 1)}
              textoVazio="Nenhuma publicação nesta semana."
              onAbrir={(pub) => setAbertaId(pub.id)}
            />
          </div>
        </div>
      </div>

      <PublicacaoModal
        publicacao={publicacaoAberta}
        onClose={() => setAbertaId(null)}
        onMarcarLida={marcarComoLida}
      />
    </>
  );
}

export default HomeComum;