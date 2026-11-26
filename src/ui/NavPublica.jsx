import { Link, useNavigate } from "react-router-dom";
import Logo from "./Logo.jsx";

// Navbar pública (a mesma da página inicial): logo, pílula de links em vidro e botão de login.
// Na home ela rola a página (onNavClick); em outras páginas, leva para a home já na seção.
export default function NavPublica({ onNavClick }) {
  const navigate = useNavigate();

  const ir = (e, alvo) => {
    e.preventDefault();
    if (onNavClick) onNavClick(e, alvo);
    else navigate("/", { state: { alvo } });
  };

  return (
    <>
      {/* Filtro SVG usado no efeito de liquid glass da navbar */}
      <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="liquid-glass" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.01 0.025" numOctaves="200" seed="15" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2.5" result="softNoise" />
            <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="100" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feColorMatrix in="displaced" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="glass" />
          </filter>
        </defs>
      </svg>

      <div className="nav-bar" data-speed="0">
        <Link to="/" className="logo" aria-label="Notice — início">
          <Logo />
        </Link>

        <div className="link-wrapper">
          <div className="link-distortion"></div>
          <div className="link">
            <a href="/" onClick={(e) => ir(e, "")}>Início</a>
            <a href="/#section-eventos" onClick={(e) => ir(e, "#section-eventos")}>Eventos</a>
            <a href="/#section-sobre" onClick={(e) => ir(e, "#section-sobre")}>Sobre</a>
            <a href="/#section-cf" onClick={(e) => ir(e, "#section-cf")}>Como funciona</a>
          </div>
        </div>

        <Link to="/login" className="login">LOGIN</Link>
      </div>
    </>
  );
}
