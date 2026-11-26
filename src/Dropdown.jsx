import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePopupPosition } from "./usePopup.js";
import "./styles/Dropdown.css";

const normalizar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * Dropdown no estilo do sistema (substitui o <select> nativo).
 *
 * options: [{ value, label, cor?, desabilitada? }]   (cor = bolinha colorida opcional)
 * variant: "campo" (formulários) | "compacto" (edição em linha) | "pilula" (barras de ação)
 *
 * Teclado: ↑ ↓ Home End navegam, Enter/Espaço escolhem, Esc fecha, letras buscam.
 */
export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  disabled = false,
  variant = "campo",
  id,
  ariaLabel,
  ariaLabelledBy,
  className = "",
}) {
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const gatilho = useRef(null);
  const lista = useRef(null);
  const busca = useRef({ texto: "", timer: null });
  const listaId = useId();

  const indiceSelecionado = options.findIndex(
    (o) => String(o.value) === String(value),
  );
  const selecionada = options[indiceSelecionado];

  const { estilo, acima } = usePopupPosition(aberto, gatilho, { alturaMax: 280 });

  const abrir = () => {
    if (disabled || !options.length) return;
    setAtivo(indiceSelecionado >= 0 ? indiceSelecionado : 0);
    setAberto(true);
  };

  const fechar = (devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) gatilho.current?.focus();
  };

  const escolher = (i) => {
    const o = options[i];
    if (!o || o.desabilitada) return;
    onChange?.(o.value);
    fechar();
  };

  // Clique fora fecha
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => {
      if (gatilho.current?.contains(e.target) || lista.current?.contains(e.target))
        return;
      setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  // Mantém a opção ativa à vista
  useEffect(() => {
    if (!aberto || ativo < 0) return;
    lista.current
      ?.querySelector(`[data-i="${ativo}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [ativo, aberto, estilo]);

  // Desabilitou com a lista aberta: fecha
  useEffect(() => {
    if (disabled) setAberto(false);
  }, [disabled]);

  const aoTeclar = (e) => {
    if (disabled) return;
    const n = options.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!aberto) abrir();
        else setAtivo((i) => (i + 1) % n);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!aberto) abrir();
        else setAtivo((i) => (i - 1 + n) % n);
        break;
      case "Home":
        if (aberto) {
          e.preventDefault();
          setAtivo(0);
        }
        break;
      case "End":
        if (aberto) {
          e.preventDefault();
          setAtivo(n - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!aberto) abrir();
        else escolher(ativo);
        break;
      case "Escape":
        if (aberto) {
          // fecha só o dropdown, não o modal que está por trás
          e.preventDefault();
          e.stopPropagation();
          fechar();
        }
        break;
      case "Tab":
        if (aberto) setAberto(false);
        break;
      default:
        // digitar letras salta para a opção correspondente
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const b = busca.current;
          clearTimeout(b.timer);
          b.texto += normalizar(e.key);
          b.timer = setTimeout(() => (b.texto = ""), 600);
          const i = options.findIndex((o) =>
            normalizar(o.label).startsWith(b.texto),
          );
          if (i >= 0) {
            if (!aberto) setAberto(true);
            setAtivo(i);
          }
        }
    }
  };

  return (
    <>
      <button
        type="button"
        id={id}
        ref={gatilho}
        className={`dd-gatilho dd-${variant} ${aberto ? "aberto" : ""} ${className}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? listaId : undefined}
        aria-activedescendant={aberto && ativo >= 0 ? `${listaId}-${ativo}` : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        onClick={() => (aberto ? fechar(false) : abrir())}
        onKeyDown={aoTeclar}
      >
        <span className={`dd-valor ${selecionada ? "" : "vazio"}`}>
          {selecionada?.cor && (
            <i className="dd-bolinha" style={{ background: selecionada.cor }} />
          )}
          <span className="dd-texto">{selecionada ? selecionada.label : placeholder}</span>
        </span>
        <svg className="dd-seta" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aberto &&
        estilo &&
        createPortal(
          <ul
            ref={lista}
            id={listaId}
            role="listbox"
            className={`dd-lista ${acima ? "acima" : ""}`}
            style={estilo}
          >
            {options.map((o, i) => {
              const sel = i === indiceSelecionado;
              return (
                <li
                  key={String(o.value)}
                  id={`${listaId}-${i}`}
                  role="option"
                  data-i={i}
                  aria-selected={sel}
                  aria-disabled={o.desabilitada || undefined}
                  className={`dd-opcao ${sel ? "selecionada" : ""} ${i === ativo ? "ativa" : ""} ${o.desabilitada ? "desabilitada" : ""}`}
                  onMouseEnter={() => setAtivo(i)}
                  onMouseDown={(e) => e.preventDefault()} /* não tira o foco do gatilho */
                  onClick={() => escolher(i)}
                >
                  {o.cor && <i className="dd-bolinha" style={{ background: o.cor }} />}
                  <span className="dd-texto">{o.label}</span>
                  {sel && (
                    <svg className="dd-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
