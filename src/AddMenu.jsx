import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePublicacaoForm } from "./PublicacaoFormContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import "./styles/addmenu.css";
import bolinhas from "./assets/img/bolinhas.png";
export default function AddMenu() {

  const [open, setOpen] = useState(false);
  const { abrirNova } = usePublicacaoForm();
  const { user } = useAuth();
  const menuRef = useRef(null);

  useEffect(() => {

    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  return (
    <div className="addmenu-container" ref={menuRef}>

      

      <div className={`addmenu-dropdown-wrapper ${open ? "open" : ""}`}>

        <div className="addmenu-dropdown-distortion"></div>

        <div className="addmenu-dropdown">
<img src={bolinhas} alt="" className="bolinhas-drop-down" />
          {user?.tipo === "super_admin" && (
            <Link to="/cadastro-usuario" className="addmenu-item" onClick={() => setOpen(false)}>
              Cadastrar usuário
            </Link>
          )}

          <button
            type="button"
            className="addmenu-item"
            onClick={() => {
              setOpen(false);
              abrirNova();
            }}
          >
            Criar publicação
          </button>

        </div>

      </div>

      <button
        className={`addmenu-btn ${open ? "rotated" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Abrir menu de ações"
      >
        <p>+</p>
      </button>

    </div>
  );

}