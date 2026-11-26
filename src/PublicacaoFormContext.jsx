import { createContext, useContext, useState, useCallback, useMemo } from "react";
import NovaPublicacaoModal from "./NovaPublicacaoModal.jsx";
import { avisarMudancaPublicacoes } from "./eventos.js";

// Permite abrir o pop-up de publicação de qualquer tela (AddMenu, Home, Categoria...)
// sem precisar passar props. Também expõe `versao`, que muda a cada publicação salva,
// para as telas que listam publicações recarregarem os dados.
const PublicacaoFormContext = createContext(null);

export function PublicacaoFormProvider({ children }) {
  const [aberto, setAberto] = useState(null); // null = fechado | { pub: null | publicação, dataInicial }
  const [versao, setVersao] = useState(0);
  const [ultimoSalvo, setUltimoSalvo] = useState(null); // { dataEvento, em } da última publicação salva

  // abrirNova() ou abrirNova({ dataEvento: "2026-11-20" }) (usado pelo calendário)
  const abrirNova = useCallback((opcoes) => {
    const data = typeof opcoes?.dataEvento === "string" ? opcoes.dataEvento : "";
    setAberto({ pub: null, dataInicial: data });
  }, []);
  const abrirEdicao = useCallback((pub) => setAberto({ pub }), []);
  const fechar = useCallback(() => setAberto(null), []);
  const aoSalvar = useCallback((info) => {
    setVersao((v) => v + 1);
    setUltimoSalvo({ dataEvento: info?.dataEvento ?? "", em: Date.now() });
    avisarMudancaPublicacoes();
  }, []);

  const valor = useMemo(
    () => ({ abrirNova, abrirEdicao, versao, ultimoSalvo }),
    [abrirNova, abrirEdicao, versao, ultimoSalvo],
  );

  return (
    <PublicacaoFormContext.Provider value={valor}>
      {children}
      {aberto && (
        <NovaPublicacaoModal
          publicacao={aberto.pub}
          dataInicial={aberto.dataInicial}
          onClose={fechar}
          onSalvo={aoSalvar}
        />
      )}
    </PublicacaoFormContext.Provider>
  );
}

export function usePublicacaoForm() {
  return useContext(PublicacaoFormContext);
}
