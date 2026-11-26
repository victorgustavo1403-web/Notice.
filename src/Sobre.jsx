import { useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { carrossel } from "./animations/hero";
import bolAzul from "./assets/img/bolinhas-categorias/geral.png";
import bolVermelha from "./assets/img/bolinhas-categorias/eventos.png";
import bolAmarela from "./assets/img/bolinhas-categorias/vagas-de-emprego.png";
import bolVerde from "./assets/img/bolinhas-categorias/coordenacao.png";
import arteTrombone from "./assets/img/padroes/trombone.jpg";
import arteQueda from "./assets/img/padroes/queda.jpg";
import arteFita from "./assets/img/padroes/fita-amarela.jpg";
import "./styles/Sobre.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Cores das categorias (as mesmas das bolinhas dos cards)
const COR = {
  azul: "#0064af",
  vermelho: "#f54526",
  amarelo: "#edbe03",
  verde: "#77b502",
  laranja: "#fd8552",
};

const SLOGAN = [
  { palavra: "Simples", cor: COR.azul },
  { palavra: "Direto", cor: COR.vermelho },
  { palavra: "Essencial", cor: COR.verde },
];

const TEXTO =
  "O Notice é um sistema desenvolvido para centralizar e organizar a divulgação dos avisos institucionais da ETEC de Campo Limpo Paulista, oferecendo à comunidade escolar — alunos, professores e funcionários — um canal único, acessível e sempre atualizado para acompanhar comunicados, eventos e informações relevantes do dia a dia escolar.";
const PALAVRAS = TEXTO.split(" ");

const PILARES = [
  {
    n: "01",
    titulo: "Um canal único",
    texto: "Comunicados, eventos e informações reunidos em um só lugar.",
    bolinhas: bolAzul,
  },
  {
    n: "02",
    titulo: "Acessível",
    texto: "Para alunos, professores e funcionários da ETEC.",
    bolinhas: bolAmarela,
  },
  {
    n: "03",
    titulo: "Sempre atualizado",
    texto: "Avisos organizados por categoria, do dia a dia escolar.",
    bolinhas: bolVerde,
  },
];

const CATEGORIAS = [
  { nome: "Geral", cor: COR.azul },
  { nome: "Eventos", cor: COR.vermelho },
  { nome: "Vagas de Emprego", cor: COR.amarelo },
  { nome: "Coordenação", cor: COR.verde },
  { nome: "Secretaria", cor: COR.laranja },
];

// Mini-cards decorativos, no mesmo formato dos cards do sistema
const MINIS = [
  { arte: arteTrombone, bolinhas: bolAzul, categoria: "Geral" },
  { arte: arteQueda, bolinhas: bolVermelha, categoria: "Eventos" },
  { arte: arteFita, bolinhas: bolAmarela, categoria: "Vagas de Emprego" },
];

export default function Sobre() {
  const raiz = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Quem pede "menos movimento" vê tudo parado e já visível
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // ---- Eyebrow: bolinhas pulam, linha se desenha ----
        gsap.from(".sb-eyebrow-bolinha", {
          scale: 0,
          duration: 0.6,
          ease: "back.out(2.6)",
          stagger: 0.08,
          scrollTrigger: { trigger: ".sb-eyebrow", start: "top 88%" },
        });
        gsap.from(".sb-eyebrow-linha", {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: ".sb-eyebrow", start: "top 88%" },
        });

        // ---- Slogan: cada frase sobe de uma "máscara", depois a bolinha salta ----
        gsap
          .timeline({
            scrollTrigger: { trigger: ".sb-slogan", start: "top 78%" },
          })
          .from(".sb-linha-texto", {
            yPercent: 115,
            rotate: 5,
            transformOrigin: "left bottom",
            duration: 1.15,
            ease: "expo.out",
            stagger: 0.14,
          })
          .from(
            ".sb-ponto",
            {
              scale: 0,
              duration: 0.7,
              ease: "back.out(3)",
              stagger: 0.14,
            },
            "-=0.75",
          );

        // ---- Colagem de mini-cards: entram em leque e depois flutuam no scroll ----
        gsap.from(".sb-mini", {
          y: 150,
          opacity: 0,
          scale: 0.9,
          duration: 1.2,
          ease: "power3.out",
          stagger: 0.16,
          scrollTrigger: { trigger: ".sb-colagem", start: "top 82%" },
        });
        gsap.utils.toArray(".sb-mini").forEach((el, i) => {
          gsap.to(el, {
            yPercent: [-14, 10, -8][i] ?? 0,
            ease: "none",
            scrollTrigger: {
              trigger: ".sb-topo-grade",
              start: "top bottom",
              end: "bottom top",
              scrub: 1.5,
            },
          });
        });

        // ---- Texto: palavra por palavra acende conforme a leitura ----
        gsap.fromTo(
          ".sb-palavra",
          { opacity: 0.14 },
          {
            opacity: 1,
            ease: "none",
            duration: 0.5,
            stagger: 0.1,
            scrollTrigger: {
              trigger: ".sb-texto",
              start: "top 82%",
              end: "bottom 55%",
              scrub: true,
            },
          },
        );

        // ---- Pilares ----
        gsap.from(".sb-pilar", {
          y: 80,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.15,
          clearProps: "transform", // devolve o controle do hover para o CSS
          scrollTrigger: { trigger: ".sb-pilares", start: "top 84%" },
        });

        // ---- Faixa de categorias em loop ----
        carrossel(".sb-marquee-trilho", 30);

        // ---- Luzes de fundo: flutuam sozinhas e deslizam no scroll ----
        gsap.utils.toArray(".sb-brilho").forEach((el, i) => {
          gsap.to(el, {
            y: i % 2 ? -40 : 40,
            x: i % 2 ? 30 : -30,
            duration: 7 + i * 1.5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          gsap.to(el, {
            yPercent: i % 2 ? 25 : -25,
            ease: "none",
            scrollTrigger: {
              trigger: "#section-sobre",
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        });

        // ---- CTA ----
        gsap.from(".sb-cta > *", {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: ".sb-cta", start: "top 92%" },
        });
      });

      // As imagens da página mudam as alturas depois de carregar: recalcula os gatilhos
      const recalcular = () => ScrollTrigger.refresh();
      const timer = setTimeout(recalcular, 500);
      window.addEventListener("load", recalcular);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("load", recalcular);
        mm.revert();
      };
    },
    { scope: raiz },
  );

  return (
    <section id="section-sobre" ref={raiz} aria-labelledby="sobre-titulo">
      <h2 id="sobre-titulo" className="sb-sr-only">
        Sobre o Notice
      </h2>

      {/* luzes ambiente (as cores das categorias) */}
      <span className="sb-brilho sb-brilho-1" aria-hidden="true" />
      <span className="sb-brilho sb-brilho-2" aria-hidden="true" />
      <span className="sb-brilho sb-brilho-3" aria-hidden="true" />

      {/* ---- Eyebrow ---- */}
      <div className="sb-eyebrow">
        <div className="sb-eyebrow-bolinhas" aria-hidden="true">
          {Object.values(COR).map((cor) => (
            <i key={cor} className="sb-eyebrow-bolinha" style={{ background: cor }} />
          ))}
        </div>
        <span className="sb-eyebrow-linha" aria-hidden="true" />
        <span className="sb-eyebrow-rotulo">Sobre</span>
      </div>

      {/* ---- Slogan + colagem ---- */}
      <div className="sb-topo-grade">
        <p className="sb-slogan" aria-label="Simples. Direto. Essencial.">
          {SLOGAN.map(({ palavra, cor }) => (
            <span
              key={palavra}
              className="sb-linha"
              style={{ "--cor": cor }}
              aria-hidden="true"
            >
              <span className="sb-linha-texto">
                {palavra}
                <i className="sb-ponto" />
              </span>
            </span>
          ))}
        </p>

        <div className="sb-colagem" aria-hidden="true">
          {MINIS.map((m, i) => (
            <div key={m.categoria} className={`sb-mini sb-mini-${i + 1}`}>
              <div className="sb-mini-arte">
                <img src={m.arte} alt="" />
              </div>
              <div className="sb-mini-info">
                <div className="sb-mini-meta">
                  <img src={m.bolinhas} alt="" />
                  <span>{m.categoria}</span>
                </div>
                <div className="sb-mini-barras">
                  <i />
                  <i />
                </div>
                <b className="sb-mini-btn">Ver publicação</b>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Texto institucional ---- */}
      <p className="sb-texto">
        {PALAVRAS.map((palavra, i) => (
          <span key={i}>
            <span className={`sb-palavra ${palavra === "Notice" ? "sb-forte" : ""}`}>
              {palavra}
            </span>{" "}
          </span>
        ))}
      </p>

      {/* ---- Pilares (tirados do próprio texto) ---- */}
      <div className="sb-pilares">
        {PILARES.map((p) => (
          <article key={p.n} className="sb-pilar">
            <div className="sb-pilar-topo">
              <img src={p.bolinhas} alt="" />
              <span>{p.n}</span>
            </div>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
          </article>
        ))}
      </div>

      {/* ---- Faixa com as categorias ---- */}
      <div className="sb-marquee" aria-hidden="true">
        <div className="sb-marquee-trilho">
          {[0, 1].map((g) => (
            <div className="sb-marquee-grupo" key={g}>
              {[...CATEGORIAS, ...CATEGORIAS].map((c, i) => (
                <span className="sb-marquee-item" key={i}>
                  <i style={{ background: c.cor }} />
                  {c.nome}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---- CTA ---- */}
     
    </section>
  );
}
