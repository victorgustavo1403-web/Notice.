import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import "../styles/ui-dialogo.css";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Pop-up padrão do sistema: fundo desfocado, cartão arredondado, animação de entrada/saída,
 * Esc para fechar, foco preso dentro do pop-up e devolvido ao botão que o abriu.
 *
 * Use <Dialogo> para formulários e conteúdo livre e <ConfirmarDialogo> para confirmações.
 */
export default function Dialogo({
  titulo,
  descricao,
  onClose,
  children,
  rodape = null,
  tamanho = "md", // sm | md | lg
  bloqueado = false, // true enquanto salva: impede fechar
  fecharAoClicarFora = true,
}) {
  const [saindo, setSaindo] = useState(false);
  const cartao = useRef(null);
  const tituloId = useId();
  const descricaoId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const bloqueadoRef = useRef(bloqueado);
  bloqueadoRef.current = bloqueado;

  const fechar = () => {
    if (bloqueadoRef.current) return;
    setSaindo(true);
    setTimeout(() => onCloseRef.current?.(), 160); // espera a animação de saída
  };

  useEffect(() => {
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // foco inicial: primeiro campo do corpo; se não houver, o próprio cartão
    const alvo = cartao.current?.querySelector("[data-autofocus]")
      ?? cartao.current?.querySelector(".dlg-corpo input:not([type=hidden]), .dlg-corpo select, .dlg-corpo textarea, .dlg-corpo button")
      ?? cartao.current;
    alvo?.focus();

    const aoTeclar = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.stopPropagation();
        fechar();
        return;
      }
      if (e.key !== "Tab" || !cartao.current) return;
      const itens = [...cartao.current.querySelectorAll(FOCAVEIS)].filter((el) => el.offsetParent !== null);
      if (!itens.length) return;
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflow;
      if (anterior instanceof HTMLElement) anterior.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      className={`dlg-overlay ${saindo ? "saindo" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && fecharAoClicarFora) fechar();
      }}
      role="presentation"
    >
      <div
        ref={cartao}
        className={`dlg-cartao dlg-${tamanho}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricao ? descricaoId : undefined}
        tabIndex={-1}
      >
        <header className="dlg-topo">
          <div>
            <h2 id={tituloId} className="dlg-titulo">{titulo}</h2>
            {descricao && <p id={descricaoId} className="dlg-descricao">{descricao}</p>}
          </div>
          <button
            type="button"
            className="dlg-fechar"
            onClick={fechar}
            disabled={bloqueado}
            aria-label="Fechar"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </header>

        <div className="dlg-corpo">{children}</div>
        {rodape && <footer className="dlg-rodape">{rodape}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Confirmação padrão (excluir, apagar...). `onConfirmar` pode ser assíncrono:
 * enquanto roda, os botões ficam travados e `erro` mostra a falha, se houver.
 */
export function ConfirmarDialogo({
  titulo,
  texto,
  rotuloConfirmar = "Confirmar",
  rotuloCarregando = "Aguarde...",
  perigo = true,
  carregando = false,
  erro = "",
  onConfirmar,
  onCancelar,
}) {
  return (
    <Dialogo titulo={titulo} onClose={onCancelar} tamanho="sm" bloqueado={carregando}>
      <div className="dlg-confirmar">
        <span className={`dlg-confirmar-icone ${perigo ? "perigo" : ""}`} aria-hidden="true">
          <AlertTriangle size={24} strokeWidth={2.2} />
        </span>
        <p className="dlg-confirmar-texto">{texto}</p>
        {erro && <p className="dlg-erro" role="alert">{erro}</p>}
        <div className="dlg-confirmar-botoes">
          <button type="button" className="btn btn-secundario" onClick={onCancelar} disabled={carregando}>
            Cancelar
          </button>
          <button
            type="button"
            className={`btn ${perigo ? "btn-perigo" : "btn-primario"}`}
            onClick={onConfirmar}
            disabled={carregando}
            data-autofocus
          >
            {carregando ? rotuloCarregando : rotuloConfirmar}
          </button>
        </div>
      </div>
    </Dialogo>
  );
}
