import "./styles/Hero.css";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  animateHeroText,
  scrollText,
  heroimageRotate,
  // carrossel, // Não utilizado atualmente.
  // herocontScale, // Não utilizado atualmente.
  heroimgScale,
  scrollTextopacity,
  // scrollcont, // Não utilizado atualmente.
  // scrollImg, // Não utilizado atualmente.
} from "./animations/hero";
import { ScrollSmoother } from "gsap/all";
// Imagens não utilizadas atualmente — mantidas no local original.
// import imghero1 from "./assets/img/Frame 1.png";
import roda from "./assets/img/agoravai.png";
import roda3 from "./assets/img/roda3.png";
// import roda2 from "./assets/img/roda2.png";
// import imghero2 from "./assets/img/Frame 2.png";
// import imghero3 from "./assets/img/Frame 12.png";
// import imghero4 from "./assets/img/Frame 21.png";
// import imghero5 from "./assets/img/Frame 5.png";
// import imghero6 from "./assets/img/Frame 3.png";
// import imghero7 from "./assets/img/Frame 7.png";
// import imghero8 from "./assets/img/Frame 9.png";
import NavPublica from "./ui/NavPublica.jsx";
import Sobre from "./Sobre.jsx";
import AgendaPublica from "./AgendaPublica.jsx";
import ComoFunciona from "./ComoFunciona.jsx";

gsap.registerPlugin(useGSAP);
gsap.registerPlugin(ScrollSmoother);

function App() {
  const smootherRef = useRef(null);
  const location = useLocation();

  // Animações e interações GSAP
  useGSAP(() => {
    animateHeroText(".heroText");
    scrollTextopacity(".main-text");
    animateHeroText(".main-text");
    scrollText(".heroText");
    scrollTextopacity(".herotext-container");
    heroimageRotate(".heroimg-container");
    heroimgScale(".heroimages");
    heroimgScale(".heroimages2");

    smootherRef.current = ScrollSmoother.create({
      content: "#smooth-content",
      wrapper: "#smooth-wrapper",
      // no celular a rolagem "suavizada" é bem mais leve (menos atraso e menos trabalho para o aparelho)
      smooth: window.matchMedia?.("(max-width: 768px)").matches ? 0.6 : 2,
    });
  }, []);

  // Ao clicar num botão, o navegador dá foco a ele e "rola até ele". Dentro do conteúdo
  // do ScrollSmoother (que usa transform) isso fazia a página saltar entre o mousedown e
  // o mouseup e o clique se perdia (ex.: dias do calendário da agenda). Evitamos o foco por
  // mouse; o foco por teclado continua funcionando.
  useEffect(() => {
    const evitarSalto = (e) => {
      if (e.target instanceof Element && e.target.closest("button, [role='button']")) e.preventDefault();
    };
    const area = document.getElementById("smooth-wrapper");
    area?.addEventListener("mousedown", evitarSalto);
    return () => area?.removeEventListener("mousedown", evitarSalto);
  }, []);

  // Vindo de outra página (ex.: login) com uma seção de destino: rola até ela
  useEffect(() => {
    const alvo = location.state?.alvo;
    if (!alvo) return;
    const t = setTimeout(() => {
      smootherRef.current?.scrollTo(alvo, true, alvo === "#section-eventos" ? "top 110px" : "top top");
    }, 700);
    return () => clearTimeout(t);
  }, [location.state]);

  // Navegação por rolagem
  const handleNavClick = (e, target) => {
    e.preventDefault();
    // a agenda precisa de folga no topo para o título não ficar sob a barra de navegação
    smootherRef.current.scrollTo(target, true, target === "#section-eventos" ? "top 110px" : "top top");
  };

  return (
    <>
      {/* NAVBAR (compartilhada com a página de login) */}
      <NavPublica onNavClick={handleNavClick} />

      {/* CONTAINER DE ROLAGEM DO SCROLLSMOOTHER */}
      <div id="smooth-wrapper">
        <div id="smooth-content" className="landing-content">
          {/* HERO: IMAGENS DE FUNDO */}
          <div className="heroimg-container">
            <img src={roda} alt="" className="roda" />
            <img src={roda3} alt="" className="roda2" />
            <img src={roda3} alt="" className="roda3" />
          </div>

          {/* HERO: TÍTULO PRINCIPAL */}
          <div className="herotext-container">
            <div className="heroText">
              <p className="heroText-p">
                <span className="n">N</span>
                <span className="otice">otice</span>
                <span className="ponto">.</span>
              </p>
              <Link to="/login" className="Conhecerbot">
                CONHECER.
              </Link>
              <a
                href="#section-eventos"
                className="hero-eventos"
                onClick={(e) => handleNavClick(e, "#section-eventos")}
              >
                Ver agenda de eventos ↓
              </a>
            </div>
          </div>

         
          

          {/* SEÇÃO: AGENDA PÚBLICA DE EVENTOS (visível sem login) */}
          <AgendaPublica />

 <Sobre />

          {/* SEÇÃO: COMO FUNCIONA */}
<ComoFunciona />

          {/* SEÇÃO: SOBRE */}
         
        </div>
      </div>
    </>
  );
}

export default App;

/* =====================================================================
   CÓDIGOS ANTERIORMENTE COMENTADOS — MANTIDOS AQUI NO FINAL DO ARQUIVO
   ===================================================================== */

/*
 * HERO: IMPORTAÇÕES DE IMAGENS DESATIVADAS
 * As importações não utilizadas continuam comentadas no início do arquivo,
 * para que possam ser reativadas no local original quando necessário.
 */

/*
 * HERO: IMAGENS ALTERNATIVAS E POSICIONAMENTO

<img
  src={imghero1}
  alt=""
  className="heroimages"
  style={{ right: "29%", top: "40%", rotate: "90deg" }}
/>
<img
  src={imghero3}
  alt=""
  className="heroimages2"
  style={{ right: "35%", bottom: "16%", rotate: "-225deg" }}
/>
<img
  src={imghero2}
  alt=""
  className="heroimages"
  style={{ left: "45.75%", bottom: "6%", rotate: "180deg" }}
/>
<img
  src={imghero4}
  alt=""
  className="heroimages2"
  style={{ left: "35%", bottom: "16%", rotate: "225deg" }}
/>
<img
  src={imghero8}
  alt=""
  className="heroimages"
  style={{ left: "29%", top: "40%", rotate: "-90deg" }}
/>
<img
  src={imghero6}
  alt=""
  className="heroimages2"
  style={{ left: "35%", top: "20%", rotate: "-45deg" }}
/>
<img
  src={imghero7}
  alt=""
  className="heroimages"
  style={{ left: "45.75%", top: "8%", rotate: "0deg" }}
/>
<img
  src={imghero5}
  alt=""
  className="heroimages2"
  style={{ right: "35%", top: "20%", rotate: "45deg" }}
/>
*/

/*
 * HERO: TEXTO DESCRITIVO E BOTÃO CONHECER

<div className="main-text">
  <div className="cansei">
    <div className="slogan">
      <h1>Simples.</h1>
      <h1>Direto.</h1>
      <h1>Essencial.</h1>
    </div>
    <p>
      O <span style={{ fontWeight: 800 }}>Notice</span> é um sistema desenvolvido
      para centralizar e organizar a divulgação dos avisos institucionais da
      ETEC de Campo Limpo Paulista, oferecendo à comunidade escolar — alunos,
      professores e funcionários — um canal único, acessível e sempre atualizado
      para acompanhar comunicados, eventos e informações relevantes do dia a dia
      escolar.
    </p>
  </div>
  <Link to="/login" className="Conhecerbot">
    CONHECER.
  </Link>
</div>
*/
