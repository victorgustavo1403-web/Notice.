import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, House, Newspaper, CalendarDays, Briefcase, Ellipsis, LogOut, Moon, Sun, UserCog, Tv, FileText } from "lucide-react";
import { useAuth } from "./AuthContext.jsx";
import Sino from "./Sino.jsx";
import { rotaInicial } from "./rotas.js";
import Logo from "./ui/Logo.jsx";
import Avatar from "./ui/Avatar.jsx";
import { useTema } from "./ui/Tema.jsx";
import calendarioIcone from "./assets/img/icones/calendario.svg";
import perfilcad from "./assets/img/icones/perfil+_ce.svg";
import "./styles/navbar.css";

export default function NavBarSuperadmin() {

  const { user, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();
  const { tema, alternar } = useTema();
  const [maisAberto, setMaisAberto] = useState(false);

  // marca o <body> para o CSS de celular reservar espaço para a barra inferior
  useEffect(() => {
    document.body.classList.add("com-nav-inferior");
    return () => document.body.classList.remove("com-nav-inferior");
  }, []);

  // fecha o menu ao trocar de página e com a tecla Esc
  useEffect(() => { setMenuAberto(false); setMaisAberto(false); }, [pathname]);
  useEffect(() => {
    if (!maisAberto) return;
    const aoTeclar = (e) => e.key === "Escape" && setMaisAberto(false);
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [maisAberto]);

  const inicio = rotaInicial(user?.tipo);
  const ativo = (rota) => pathname === rota || pathname.startsWith(rota + "/");
  const veAreaProfessor = ["professor", "coordenacao", "administrador", "super_admin"].includes(user?.tipo);
  const veFuncionarios = ["coordenacao", "administrador", "super_admin"].includes(user?.tipo);
  const abasPrincipais = [
    { rota: inicio, rotulo: "Início", Icone: House },
    { rota: "/categoria/geral", rotulo: "Geral", Icone: Newspaper },
    { rota: "/categoria/eventos", rotulo: "Eventos", Icone: CalendarDays },
    { rota: "/categoria/vagas", rotulo: "Vagas", Icone: Briefcase },
  ];
  const outrasCategorias = [
    { rota: "/categoria/coordenacao", rotulo: "Coordenação", cor: "#77B502" },
    { rota: "/categoria/secretaria", rotulo: "Secretaria", cor: "#FD8552" },
    ...(veAreaProfessor ? [{ rota: "/categoria/professor", rotulo: "Área do professor", cor: "#7B3FE4" }] : []),
    ...(veFuncionarios ? [{ rota: "/categoria/funcionarios", rotulo: "Área dos funcionários", cor: "#8D8D92" }] : []),
  ];
  const categoriaOculta = ativo("/categoria/anexos") || outrasCategorias.some((c) => ativo(c.rota)) || ativo("/perfil") || ativo("/cadastro-usuario") || ativo("/curriculos");
  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (e) => e.key === "Escape" && setMenuAberto(false);
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);

  return (
    <div className="nav-bar-componente">

      <div className={`nav-bar-h ${user?.tipo === "super_admin" ? "nav-super" : ""}`} data-speed="0">

        <Link to={rotaInicial(user?.tipo)} className="logo-h" aria-label="Notice — ir para o início">
          <Logo />
        </Link>

        <div id="menu-principal" className={`links-grupo ${menuAberto ? "aberto" : ""}`}>
          <div className="link-wrapper-h">
            <div className="link-distortion-h"></div>

            <div className="link-h">
              <Link to={rotaInicial(user?.tipo)}>Início</Link>
              <Link to="/categoria/geral">Geral <div className="link-bolinha" style={{backgroundColor:'#0064AF'}}></div> </Link>
              <Link to="/categoria/eventos" >Eventos <div className="link-bolinha" style={{backgroundColor:'#F54526'}}></div> </Link>
              <Link to="/categoria/vagas">Vagas de emprego <div className="link-bolinha" style={{backgroundColor:'#EDBE03'}}></div></Link>
              <Link to="/categoria/coordenacao">Coordenação <div className="link-bolinha" style={{backgroundColor:'#77B502'}}></div></Link>
              <Link to="/categoria/secretaria">Secretaria <div className="link-bolinha" style={{backgroundColor:'#FD8552'}}></div></Link>
              <Link to="/categoria/anexos" className="link-icone" title="Calendário" aria-label="Calendário">
                <img src={calendarioIcone} alt="" style={{ width: "22px", height: "22px" }} />
              </Link>
            </div>
          </div>

          {/* Áreas restritas: barra separada, à direita da principal (professor vê a sua; coordenação e administradores veem as duas) */}
          {["professor", "coordenacao", "administrador", "super_admin"].includes(user?.tipo) && (
            <div className="link-wrapper-h link-wrapper-areas">
              <div className="link-distortion-h"></div>

              <div className="link-h">
                <Link to="/categoria/professor">Área do professor <div className="link-bolinha" style={{backgroundColor:'#7B3FE4'}}></div></Link>
                {["coordenacao", "administrador", "super_admin"].includes(user?.tipo) && (
                  <Link to="/categoria/funcionarios">Área dos funcionários <div className="link-bolinha" style={{backgroundColor:'#8D8D92'}}></div></Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sino + SAIR juntos num bloco só, para a barra manter o mesmo layout */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Mural da TV do corredor: abre em outra aba, pronto para tela cheia */}
          {["administrador", "super_admin"].includes(user?.tipo) && (
            <a href="/tv" target="_blank" rel="noopener noreferrer" className="nav-tv" title="Abrir mural da TV" aria-label="Abrir mural da TV (nova aba)">
              <Tv size={20} strokeWidth={2.2} />
              <span>Mural TV</span>
            </a>
          )}
          {/* Currículos que os alunos enviaram para as vagas */}
          {["administrador", "super_admin"].includes(user?.tipo) && (
            <Link to="/curriculos" className={`nav-tv nav-curriculos ${ativo("/curriculos") ? "ativo" : ""}`} title="Currículos recebidos" aria-label="Currículos recebidos">
              <FileText size={20} strokeWidth={2.2} />
            </Link>
          )}
          {user?.tipo === "super_admin" && (
            <Link to="/cadastro-usuario">
              <div className="container-icone-perfilcad">
                <img src={perfilcad} alt="Perfil" className="icone-perfilcad" />
              </div>
            </Link>
          )}

          {/* Sino de notificações: só para usuários comuns (alunos e professores) */}
          {["comum", "professor", "coordenacao"].includes(user?.tipo) && <Sino />}

          <Link to="/perfil" className="nav-perfil" title="Meu perfil" aria-label="Meu perfil">
            <Avatar usuario={user} tamanho={40} />
          </Link>

          <button onClick={logout} className="sair">
            SAIR
          </button>

          {/* Em telas pequenas os links ficam dentro deste menu */}
          <button
            type="button"
            className="nav-menu-botao"
            onClick={() => setMenuAberto((v) => !v)}
            aria-expanded={menuAberto}
            aria-controls="menu-principal"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          >
            {menuAberto ? <X size={20} strokeWidth={2.4} /> : <Menu size={20} strokeWidth={2.4} />}
          </button>
        </div>

      </div>


      {/* ===== CELULAR: barra de abas inferior + folha "Mais" (CSS só mostra em telas pequenas) ===== */}
      <nav className="nav-inferior" aria-label="Navegação principal">
        {abasPrincipais.map(({ rota, rotulo, Icone }) => (
          <Link key={rota} to={rota} className={`nav-inferior-item ${ativo(rota) ? "ativo" : ""}`} aria-current={ativo(rota) ? "page" : undefined}>
            <Icone size={22} strokeWidth={2.2} />
            <span>{rotulo}</span>
          </Link>
        ))}
        <button
          type="button"
          className={`nav-inferior-item ${maisAberto || categoriaOculta ? "ativo" : ""}`}
          onClick={() => setMaisAberto((v) => !v)}
          aria-expanded={maisAberto}
          aria-controls="folha-mais"
        >
          <Ellipsis size={22} strokeWidth={2.2} />
          <span>Mais</span>
        </button>
      </nav>

      {maisAberto && (
        <div className="folha-fundo" onClick={() => setMaisAberto(false)}>
          <div id="folha-mais" className="folha" role="dialog" aria-modal="true" aria-label="Mais opções" onClick={(e) => e.stopPropagation()}>
            <span className="folha-alca" aria-hidden="true" />
            <Link to="/perfil" className="folha-perfil">
              <Avatar usuario={user} tamanho={46} />
              <span><strong>{user?.nome}</strong><small>Ver e editar meu perfil</small></span>
            </Link>
            <ul className="folha-lista">
              {outrasCategorias.map((c) => (
                <li key={c.rota}>
                  <Link to={c.rota} className={ativo(c.rota) ? "ativo" : ""}>
                    <i style={{ backgroundColor: c.cor }} />{c.rotulo}
                  </Link>
                </li>
              ))}
              {user?.tipo === "super_admin" && (
                <li><Link to="/cadastro-usuario"><UserCog size={18} />Gerenciar usuários</Link></li>
              )}
              {["administrador", "super_admin"].includes(user?.tipo) && (
                <li><Link to="/curriculos" className={ativo("/curriculos") ? "ativo" : ""}><FileText size={18} />Currículos recebidos</Link></li>
              )}
              {["administrador", "super_admin"].includes(user?.tipo) && (
                <li><a href="/tv" target="_blank" rel="noopener noreferrer"><Tv size={18} />Mural da TV</a></li>
              )}
              {/* último da lista, sem marcador */}
              <li><Link to="/categoria/anexos" className={`sem-marcador ${ativo("/categoria/anexos") ? "ativo" : ""}`}>Calendário</Link></li>
            </ul>
            <div className="folha-rodape">
              <button type="button" onClick={alternar}>
                {tema === "escuro" ? <Sun size={18} /> : <Moon size={18} />}
                {tema === "escuro" ? "Tema claro" : "Tema escuro"}
              </button>
              <button type="button" className="sair-folha" onClick={logout}><LogOut size={18} />Sair</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}