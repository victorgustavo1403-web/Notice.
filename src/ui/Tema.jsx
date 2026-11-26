import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import "../styles/ui-tema.css";

// Tema claro/escuro. A escolha fica no navegador (localStorage); sem escolha, segue o
// tema do sistema. O atributo data-tema no <html> é aplicado antes da página carregar
// (script no index.html), então não há "piscada" de tema errado.
const CHAVE = "notice-tema";
const TemaContext = createContext({ tema: "claro", alternar: () => {}, definir: () => {} });

function temaInicial() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === "claro" || salvo === "escuro") return salvo;
  } catch { /* armazenamento indisponível */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tema === "escuro" ? "#141412" : "#ffffff");
  }, [tema]);

  const alternar = useCallback(() => {
    const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduzir) {
      const raiz = document.documentElement;
      raiz.classList.add("tema-trocando");
      setTimeout(() => raiz.classList.remove("tema-trocando"), 450);
    }
    setTema((atual) => {
      const novo = atual === "escuro" ? "claro" : "escuro";
      try { localStorage.setItem(CHAVE, novo); } catch { /* sem armazenamento */ }
      return novo;
    });
  }, []);

  // Define um tema direto (usado pelo mural da TV, que abre sempre no tema escolhido).
  // salvar=false: vale só para esta aba e não muda a preferência guardada no aparelho.
  const definir = useCallback((novo, salvar = true) => {
    if (novo !== "claro" && novo !== "escuro") return;
    if (salvar) {
      try { localStorage.setItem(CHAVE, novo); } catch { /* sem armazenamento */ }
    }
    setTema(novo);
  }, []);

  const valor = useMemo(() => ({ tema, alternar, definir }), [tema, alternar, definir]);
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export const useTema = () => useContext(TemaContext);

// Botão flutuante, presente em todas as páginas
export function BotaoTema() {
  const { tema, alternar } = useTema();
  const escuro = tema === "escuro";
  const rotulo = escuro ? "Ativar tema claro" : "Ativar tema escuro";
  return (
    <button
      type="button"
      className="tema-botao"
      onClick={alternar}
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={escuro}
    >
      <span className="tema-botao-icone" aria-hidden="true">
        {escuro ? <Sun size={20} strokeWidth={2.2} /> : <Moon size={20} strokeWidth={2.2} />}
      </span>
    </button>
  );
}
