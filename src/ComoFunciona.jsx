import { useRef } from "react";
import { gsap } from "gsap";
import { Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import bolAzul from "./assets/img/bolinhas-categorias/geral.png";
import bolVermelha from "./assets/img/bolinhas-categorias/eventos.png";
import bolAmarela from "./assets/img/bolinhas-categorias/vagas-de-emprego.png";
import artE1 from "./assets/img/landing/e1.jpg";
import artE3 from "./assets/img/landing/e3.jpg";
import artE5 from "./assets/img/landing/e5.jpg";
import artE4 from "./assets/img/landing/e4.jpg";
import artG3 from "./assets/img/landing/g3.jpg";
import artV3 from "./assets/img/landing/v3.jpg";
import "./styles/ComoFunciona.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const COR = {
  azul: "#0064af",
  vermelho: "#f54526",
  amarelo: "#edbe03",
  verde: "#77b502",
  laranja: "#fd8552",
};

const CATEGORIAS = [
  { nome: "Geral", cor: COR.azul },
  { nome: "Eventos", cor: COR.vermelho },
  { nome: "Vagas de Emprego", cor: COR.amarelo },
  { nome: "Coordenação", cor: COR.verde },
  { nome: "Secretaria", cor: COR.laranja },
];

const TITULO_DIGITADO = "Feira de ciências";

// Os três "palcos" são miniaturas da interface real (formulário, cards + pop-up, relatório)
export default function ComoFunciona() {
  const raiz = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(raiz);

        // ---- Cabeçalho ----
        gsap.from(q(".cf2-eyebrow-bolinha"), {
          scale: 0, duration: 0.6, ease: "back.out(2.6)", stagger: 0.08,
          scrollTrigger: { trigger: ".cf2-eyebrow", start: "top 90%" },
        });
        gsap.from(q(".cf2-eyebrow-linha"), {
          scaleX: 0, transformOrigin: "left center", duration: 1.1, ease: "power3.out",
          scrollTrigger: { trigger: ".cf2-eyebrow", start: "top 90%" },
        });
        gsap
          .timeline({ scrollTrigger: { trigger: ".cf2-titulo", start: "top 82%" } })
          .from(q(".cf2-titulo-texto"), {
            yPercent: 115, rotate: 5, transformOrigin: "left bottom",
            duration: 1.15, ease: "expo.out",
          })
          .from(q(".cf2-ponto"), { scale: 0, duration: 0.7, ease: "back.out(3)" }, "-=0.7")
          .from(q(".cf2-lead"), { y: 30, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.6");
        gsap.from(q(".cf2-chip"), {
          scale: 0.6, opacity: 0, duration: 0.6, ease: "back.out(2.4)", stagger: 0.09,
          scrollTrigger: { trigger: ".cf2-legenda", start: "top 90%" },
        });

        // ---- Cada cena: texto + palco ----
        gsap.utils.toArray(".cf2-cena").forEach((cena) => {
          const c = gsap.utils.selector(cena);

          gsap
            .timeline({ scrollTrigger: { trigger: cena, start: "top 74%" } })
            .from(c(".cf2-num"), { opacity: 0, y: 20, duration: 0.5 })
            .from(c(".cf2-cena-linha"), { yPercent: 115, duration: 0.9, ease: "expo.out", stagger: 0.1 }, "<0.1")
            .from(c(".cf2-cena-texto, .cf2-tags span"), {
              opacity: 0, y: 24, duration: 0.7, ease: "power3.out", stagger: 0.07,
            }, "-=0.5")
            .from(c(".cf2-palco"), { opacity: 0, y: 70, scale: 0.94, duration: 1, ease: "power3.out" }, "<");

          gsap.fromTo(c(".cf2-palco-in"), { yPercent: 5 }, {
            yPercent: -5, ease: "none",
            scrollTrigger: { trigger: cena, start: "top bottom", end: "bottom top", scrub: 1.2 },
          });
        });

        // ---- Cena 1: cadastro da publicação (digita, escolhe categoria, imagem e publica) ----
        const titulo = q(".cf2-digita")[0];
        const valorCat = q(".cf2-cat-valor")[0];
        const bolinhaCat = q(".cf2-cat-bolinha")[0];
        const digitando = { n: 0 };
        titulo.textContent = "";
        valorCat.textContent = "Selecione uma categoria...";
        valorCat.classList.add("vazio");
        bolinhaCat.style.display = "none";
        q(".cf2-thumb").forEach((t) => t.classList.remove("ativa"));

        gsap
          .timeline({ scrollTrigger: { trigger: ".cf2-form", start: "top 70%" }, delay: 0.6 })
          .from(q(".cf2-campo"), { opacity: 0, y: 18, duration: 0.5, stagger: 0.12 })
          .to(digitando, {
            n: TITULO_DIGITADO.length, duration: 1.1, ease: "none",
            onUpdate: () => { titulo.textContent = TITULO_DIGITADO.slice(0, Math.round(digitando.n)); },
          })
          .to(q(".cf2-lista"), { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(1.6)" }, "+=0.25")
          .to(q(".cf2-lista-op.alvo"), { backgroundColor: "rgba(51,51,51,0.09)", duration: 0.2 }, "+=0.35")
          .call(() => {
            valorCat.textContent = "Eventos";
            valorCat.classList.remove("vazio");
            bolinhaCat.style.display = "block";
          })
          .to(q(".cf2-lista"), { opacity: 0, scale: 0.96, y: -6, duration: 0.25 }, "+=0.2")
          .call(() => q(".cf2-thumb")[1].classList.add("ativa"), null, "+=0.15")
          .from(q(".cf2-thumb.ativa .cf2-check"), { scale: 0, duration: 0.4, ease: "back.out(3)" })
          .to(q(".cf2-btn-publicar"), { scale: 0.93, duration: 0.12, yoyo: true, repeat: 1 }, "+=0.5")
          .from(q(".cf2-toast"), { opacity: 0, y: 14, scale: 0.9, duration: 0.45, ease: "back.out(2)" });

        // ---- Cena 2: cards por cor + pop-up + sino ----
        const contador = q(".cf2-badge-n")[0];
        contador.textContent = "3";
        gsap
          .timeline({ scrollTrigger: { trigger: ".cf2-vitrine", start: "top 70%" }, delay: 0.5 })
          .from(q(".cf2-mini"), { y: 90, opacity: 0, rotate: (i) => [-6, 0, 6][i], duration: 0.9, ease: "power3.out", stagger: 0.16 })
          .from(q(".cf2-sino"), { scale: 0, duration: 0.5, ease: "back.out(3)" }, "-=0.4")
          .to(q(".cf2-badge"), { scale: 1.25, duration: 0.18, yoyo: true, repeat: 1 }, "+=0.2")
          .fromTo(q(".cf2-popup"), { opacity: 0, scale: 0.82, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.5)" }, "+=0.3")
          .call(() => { contador.textContent = "2"; }, null, "-=0.2")
          .fromTo(q(".cf2-badge"), { scale: 1.4 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });

        // ---- Cena 3: relatório (números sobem, linha se desenha) ----
        const numeros = q(".cf2-conta");
        numeros.forEach((el) => { el.dataset.alvo = el.textContent; el.textContent = "0"; });
        const tl3 = gsap.timeline({ scrollTrigger: { trigger: ".cf2-painel", start: "top 70%" }, delay: 0.4 });
        tl3
          .from(q(".cf2-stat"), { opacity: 0, y: 24, duration: 0.6, stagger: 0.12, ease: "power3.out" })
          .from(q(".cf2-grafico-card"), { opacity: 0, y: 24, duration: 0.6, ease: "power3.out" }, "-=0.3")
          .fromTo(q(".cf2-linha"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut" }, "-=0.2")
          .from(q(".cf2-area"), { opacity: 0, duration: 1 }, "-=1")
          .from(q(".cf2-ponto-grafico"), { scale: 0, transformOrigin: "center", duration: 0.4, ease: "back.out(3)", stagger: 0.2 }, "-=1.2");
        numeros.forEach((el) => {
          const alvo = Number(el.dataset.alvo);
          const obj = { v: 0 };
          tl3.to(obj, { v: alvo, duration: 1.4, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(obj.v); } }, 0.5);
        });

        // ---- Luzes de fundo ----
        gsap.utils.toArray(q(".cf2-brilho")).forEach((el, i) => {
          gsap.to(el, { y: i % 2 ? -40 : 40, x: i % 2 ? 30 : -30, duration: 7 + i * 1.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
          gsap.to(el, {
            yPercent: i % 2 ? 25 : -25, ease: "none",
            scrollTrigger: { trigger: "#section-cf", start: "top bottom", end: "bottom top", scrub: true },
          });
        });
      });

      const recalcular = () => ScrollTrigger.refresh();
      const timer = setTimeout(recalcular, 600);
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
    <section id="section-cf" ref={raiz} aria-labelledby="cf-titulo">
      <span className="cf2-brilho cf2-brilho-1" aria-hidden="true" />
      <span className="cf2-brilho cf2-brilho-2" aria-hidden="true" />
      <span className="cf2-brilho cf2-brilho-3" aria-hidden="true" />

      {/* ---- Cabeçalho ---- */}
      <div className="cf2-eyebrow">
        <div className="cf2-eyebrow-bolinhas" aria-hidden="true">
          {Object.values(COR).map((cor) => (
            <i key={cor} className="cf2-eyebrow-bolinha" style={{ background: cor }} />
          ))}
        </div>
        <span className="cf2-eyebrow-linha" aria-hidden="true" />
        <span className="cf2-eyebrow-rotulo">Como funciona</span>
      </div>

      <header className="cf2-cabecalho">
        <h2 id="cf-titulo" className="cf2-titulo">
          <span className="cf2-titulo-mascara">
            <span className="cf2-titulo-texto">
              Como funciona<i className="cf2-ponto" />
            </span>
          </span>
        </h2>
        <p className="cf2-lead">
          Do cadastro do aviso ao relatório de acessos, tudo em um só lugar, com
          avisos separados por cores de acordo com a categoria.
        </p>
        <ul className="cf2-legenda" aria-label="Categorias e suas cores">
          {CATEGORIAS.map((c) => (
            <li key={c.nome} className="cf2-chip">
              <i style={{ background: c.cor }} />
              {c.nome}
            </li>
          ))}
        </ul>
      </header>

      {/* ================= CENA 1: cadastro da publicação ================= */}
      <article className="cf2-cena">
        <div className="cf2-cena-conteudo">
          <span className="cf2-num">01</span>
          <h3 className="cf2-cena-titulo">
            <span className="cf2-cena-mascara"><span className="cf2-cena-linha">Publique o aviso</span></span>
            <span className="cf2-cena-mascara"><span className="cf2-cena-linha">em poucos cliques.</span></span>
          </h3>
          <p className="cf2-cena-texto">
            Escolha a categoria, envie uma imagem ou use uma das imagens padrão
            e, se for um evento, marque a data. O aviso entra no ar para toda a
            comunidade escolar.
          </p>
          <div className="cf2-tags">
            <span>Imagens padrão</span>
            <span>Data do evento</span>
            <span>Categorias por cor</span>
          </div>
        </div>

        <div className="cf2-palco">
          <div className="cf2-palco-in">
            <div className="cf2-mock cf2-form" aria-hidden="true">
              <img src={bolVermelha} alt="" className="cf2-form-bolinhas" />
              <p className="cf2-form-titulo">Nova publicação</p>
              <span className="cf2-form-sublinhado" />

              <div className="cf2-campo">
                <span className="cf2-rotulo">Título</span>
                <div className="cf2-input">
                  <span className="cf2-digita">{TITULO_DIGITADO}</span>
                  <i className="cf2-cursor" />
                </div>
              </div>

              <div className="cf2-linha-dupla">
                <div className="cf2-campo cf2-campo-cat">
                  <span className="cf2-rotulo">Categoria</span>
                  <div className="cf2-input cf2-select">
                    <i className="cf2-cat-bolinha" style={{ background: COR.vermelho }} />
                    <span className="cf2-cat-valor">Eventos</span>
                    <svg width="1em" height="0.7em" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>

                  <ul className="cf2-lista">
                    {CATEGORIAS.slice(0, 4).map((c) => (
                      <li key={c.nome} className={`cf2-lista-op ${c.nome === "Eventos" ? "alvo" : ""}`}>
                        <i style={{ background: c.cor }} />
                        {c.nome}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="cf2-campo">
                  <span className="cf2-rotulo">Data do evento (opcional)</span>
                  <div className="cf2-input cf2-data">
                    <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
                    20 de nov. de 2026
                  </div>
                </div>
              </div>

              <div className="cf2-campo">
                <span className="cf2-rotulo">Imagens padrão de Eventos</span>
                <div className="cf2-thumbs">
                  {[artE1, artE3, artE5].map((a, i) => (
                    <div key={i} className={`cf2-thumb ${i === 1 ? "ativa" : ""}`}>
                      <img src={a} alt="" />
                      <span className="cf2-check">
                        <svg width="0.9em" height="0.9em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cf2-rodape">
                <span className="cf2-btn cf2-btn-cancelar">Cancelar</span>
                <span className="cf2-btn cf2-btn-publicar">Publicar</span>
              </div>

              <div className="cf2-toast">
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                Aviso publicado
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* ================= CENA 2: visualização dos cards ================= */}
      <article className="cf2-cena cf2-invertida">
        <div className="cf2-cena-conteudo">
          <span className="cf2-num">02</span>
          <h3 className="cf2-cena-titulo">
            <span className="cf2-cena-mascara"><span className="cf2-cena-linha">Cada aviso no seu</span></span>
            <span className="cf2-cena-mascara"><span className="cf2-cena-linha">lugar, na sua cor.</span></span>
          </h3>
          <p className="cf2-cena-texto">
            Os avisos aparecem em cards separados por categoria. Abra um card
            para ler o conteúdo completo e a data do evento. Ao abrir, o aviso
            conta como lido e o sino mostra quando chega algo novo.
          </p>
          <div className="cf2-tags">
            <span>Cards por cor</span>
            <span>Lido ao abrir</span>
            <span>Sino de avisos</span>
          </div>
        </div>

        <div className="cf2-palco">
          <div className="cf2-palco-in">
            <div className="cf2-mock cf2-vitrine" aria-hidden="true">
              <div className="cf2-sino">
                <svg width="1.5em" height="1.5em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                <span className="cf2-badge"><span className="cf2-badge-n">2</span></span>
              </div>

              <div className="cf2-minis">
                {[
                  { arte: artG3, bol: bolAzul, titulo: "Comunicado geral", cat: "Geral" },
                  { arte: artE4, bol: bolVermelha, titulo: "Semana de eventos", cat: "Eventos" },
                  { arte: artV3, bol: bolAmarela, titulo: "Vagas de estágio", cat: "Vagas de Emprego" },
                ].map((m) => (
                  <div key={m.cat} className="cf2-mini">
                    <div className="cf2-mini-arte"><img src={m.arte} alt="" /></div>
                    <div className="cf2-mini-info">
                      <div className="cf2-mini-meta">
                        <img src={m.bol} alt="" />
                        <span>16/10/2026</span>
                      </div>
                      <strong>{m.titulo}</strong>
                      <em>{m.cat}</em>
                      <b className="cf2-mini-btn">Ver publicação</b>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cf2-popup">
                <div className="cf2-popup-card">
                  <div className="cf2-popup-arte"><img src={artE4} alt="" /></div>
                  <div className="cf2-popup-info">
                    <div className="cf2-mini-meta">
                      <img src={bolVermelha} alt="" />
                      <span>16/10/2026</span>
                    </div>
                    <strong>Semana de eventos</strong>
                    <em>Eventos</em>
                    <b className="cf2-popup-lida">
                      <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      Lida
                    </b>
                  </div>
                </div>
                <div className="cf2-popup-desc">
                  <small>Data do evento</small>
                  <span className="cf2-popup-data">
                    <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
                    20 de novembro de 2026
                  </span>
                  <small>Descrição</small>
                  <i /><i /><i className="curta" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* ================= CENA 3: relatório de acessos ================= */}
      <article className="cf2-cena">
        <div className="cf2-cena-conteudo">
          <span className="cf2-num">03</span>
          <h3 className="cf2-cena-titulo">
            <span className="cf2-cena-mascara"><span className="cf2-cena-linha">Acompanhe cada</span></span>
            <span className="cf2-cena-mascara"><span className="cf2-cena-linha">acesso ao sistema.</span></span>
          </h3>
          <p className="cf2-cena-texto">
            O relatório do super administrador mostra quantos usuários estão
            ativos, quem ainda não entrou e os logins por dia, com filtro de
            período e exportação em CSV.
          </p>
          <div className="cf2-tags">
            <span>Logins por dia</span>
            <span>Filtro por período</span>
            <span>Exportar CSV</span>
          </div>
        </div>

        <div className="cf2-palco" >
          <div className="cf2-palco-in">
            <div className="cf2-mock cf2-painel" aria-hidden="true">
              <div className="cf2-painel-topo">
                <strong>Relatório de acessos</strong>
                <div className="cf2-painel-acoes">
                  <span className="cf2-pilula">Últimos 30 dias
                    <svg width="0.9em" height="0.6em" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span className="cf2-pilula escura">Exportar CSV</span>
                </div>
              </div>

              <div className="cf2-stats">
                <div className="cf2-stat">
                  <small>Usuários ativos</small>
                  <b><span className="cf2-conta">4</span> de 7</b>
                  <em>57% do total no período</em>
                </div>
                <div className="cf2-stat">
                  <small>Nunca acessaram</small>
                  <b><span className="cf2-conta">3</span></b>
                  <em>contas sem nenhum login</em>
                </div>
                <div className="cf2-stat">
                  <small>Logins no período</small>
                  <b><span className="cf2-conta">52</span></b>
                  <em>soma de todos os dias</em>
                </div>
              </div>

              <div className="cf2-grafico-card">
                <small>Logins por dia</small>
                <svg className="cf2-grafico" viewBox="0 0 320 110" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="cf2-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#333" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#333" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <g stroke="rgba(51,51,51,0.12)" strokeDasharray="3 4">
                    <line x1="0" y1="22" x2="320" y2="22" /><line x1="0" y1="55" x2="320" y2="55" /><line x1="0" y1="88" x2="320" y2="88" />
                  </g>
                  <path className="cf2-area" d="M0 92 C30 80 50 30 80 28 S130 60 160 52 S220 30 250 40 S300 50 320 38 L320 110 L0 110 Z" fill="url(#cf2-grad)" />
                  <path className="cf2-linha" pathLength="1" strokeDasharray="1" strokeDashoffset="0" d="M0 92 C30 80 50 30 80 28 S130 60 160 52 S220 30 250 40 S300 50 320 38" fill="none" stroke="#333" strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  {[[80, 28], [160, 52], [250, 40], [320, 38]].map(([x, y]) => (
                    <circle key={x} className="cf2-ponto-grafico" cx={x} cy={y} r="3.6" fill="#fff" stroke="#333" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </article>
       <div className="sb-cta">
        <Link to="/login" className="Conhecerbot">
          CONHECER.
        </Link>
        <p className="sb-rodape">Notice. · ETEC de Campo Limpo Paulista</p>
      </div>
    </section>
  );
}
