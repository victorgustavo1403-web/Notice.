import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import "../styles/ui-avisos.css";

const AvisosContexto = createContext({
  sucesso: () => {},
  erro: () => {},
  info: () => {},
});

const ICONES = { sucesso: CheckCircle2, erro: AlertCircle, info: Info };

/**
 * Avisos rápidos (toasts) padronizados, no lugar de alert().
 *   const avisos = useAvisos();
 *   avisos.sucesso("Usuário criado.");  avisos.erro("Não foi possível salvar.");
 */
export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const proximo = useRef(1);

  const remover = useCallback((id) => {
    setAvisos((lista) => lista.filter((a) => a.id !== id));
  }, []);

  const mostrar = useCallback(
    (tipo, mensagem) => {
      const id = proximo.current++;
      setAvisos((lista) => [...lista.slice(-3), { id, tipo, mensagem }]);
      setTimeout(() => remover(id), tipo === "erro" ? 6500 : 4200);
    },
    [remover],
  );

  const api = useMemo(
    () => ({
      sucesso: (m) => mostrar("sucesso", m),
      erro: (m) => mostrar("erro", m),
      info: (m) => mostrar("info", m),
    }),
    [mostrar],
  );

  return (
    <AvisosContexto.Provider value={api}>
      {children}
      <div className="avisos" aria-live="polite" aria-atomic="false">
        {avisos.map((a) => {
          const Icone = ICONES[a.tipo];
          return (
            <div key={a.id} className={`aviso aviso-${a.tipo}`} role={a.tipo === "erro" ? "alert" : "status"}>
              <Icone size={18} strokeWidth={2.2} aria-hidden="true" />
              <span>{a.mensagem}</span>
              <button type="button" onClick={() => remover(a.id)} aria-label="Dispensar aviso">
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>
          );
        })}
      </div>
    </AvisosContexto.Provider>
  );
}

export function useAvisos() {
  return useContext(AvisosContexto);
}
