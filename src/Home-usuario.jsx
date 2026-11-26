import "./styles/home.css";
import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import { gsap } from "gsap";
import NavBarSuperadmin from "./Nav-bar.jsx";
import AddMenu from "./AddMenu.jsx";
import { usePublicacaoForm } from "./PublicacaoFormContext.jsx";
import imghome from "./assets/img/auth.png";
import bolinhas from "./assets/img/bolinhas.png";
import { useGSAP } from "@gsap/react";
import { animateHeroText, scrollText } from "./animations/hero";
import { ScrollSmoother, ScrollTrigger } from "gsap/all";
import RelatorioAcessos from "./RelatorioAcessos.jsx";
import { obterToken } from "./sessao.js";



gsap.registerPlugin(useGSAP);
gsap.registerPlugin(ScrollSmoother, ScrollTrigger);

function Home() {
  const smootherRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { abrirNova } = usePublicacaoForm();

  const [publicacoes, setPublicacoes] = useState([]);
  const [carregandoPubs, setCarregandoPubs] = useState(true);

  // quem pode publicar (administrador ou super_admin)
  const podePublicar =
    user?.tipo === "administrador" || user?.tipo === "super_admin";

  useEffect(() => {
    const buscarPublicacoes = async () => {
      try {
        // a rota exige login: sem o token ela respondia 401 a cada 10 s
        const token = obterToken();
        const resposta = await fetch("http://localhost:3001/publicacoes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resposta.ok) return;
        const dados = await resposta.json();
        setPublicacoes(dados);
      } catch (err) {
        console.error("Erro ao buscar publicações:", err);
      } finally {
        setCarregandoPubs(false);
      }
    };

    buscarPublicacoes(); // busca assim que a página carrega

    const intervalo = setInterval(buscarPublicacoes, 10000); // busca de novo a cada 10s

    return () => clearInterval(intervalo); // limpa o intervalo ao sair da página
  }, []);

  // O relatório carrega depois da página e aumenta a altura do conteúdo:
  // avisa o ScrollSmoother para recalcular, senão o final fica inalcançável.
  useEffect(() => {
    const conteudo = document.getElementById("smooth-content");
    if (!conteudo || typeof ResizeObserver === "undefined") return;

    let timer;
    const observador = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    observador.observe(conteudo);

    return () => {
      clearTimeout(timer);
      observador.disconnect();
    };
  }, []);

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

  return (
    <>
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

   <NavBarSuperadmin />
<AddMenu/>
      <div id="smooth-wrapper">
        <div id="smooth-content">

          

          <div className="sla">
            <div className="hometext-container">
              <div className="mds">
                <p>
                  <span className="n-h">N</span>
                  <span className="otice-h">otice</span>
                  <span className="ponto-h">.</span>
                </p>


                   <img src={bolinhas} alt="Bolinhas" className="bolinhas" style={{paddingLeft: "1%"}} />

              </div>
             
              <div className="homeText">
                <div className="testo">
                  <h2>
                    Seja bem-vindo(a) <br />{" "}
                    <span className="super-admin-h">Super Admin.</span>
                  </h2>

                  <p class="homeText-descricao">
                    Gerencie todas as publicações e usuários do sistema.
                  </p>
                </div>

                <div className="homebuttons-container">
                  <button type="button" className="btn-home" onClick={abrirNova}>
                    + Nova publicação
                  </button>

                  <Link to="/cadastro-usuario" className="btn-home2">
                    + Novos usuários
                  </Link>
                </div>
              </div>
            </div>

            <div className="homeimg-container">
              <img src={imghome} alt="" />
            </div>
          </div>

          {/* O relatório só existe para o super admin (o backend recusa os demais) */}
          {user?.tipo === "super_admin" && (
            <section className="home-relatorio">
              <RelatorioAcessos />
            </section>
          )}

        </div>
      </div>
    </>
  );
}

export default Home;
