import { useCallback, useEffect, useState } from "react";
import Calendario from "./Calendario.jsx";
import PublicacaoModal from "./PublicacaoModal.jsx";
import { prepararPublicacao } from "./CardPublicacao.jsx";
import bolinhas from "./assets/img/bolinhas.png";
import "./styles/AgendaPublica.css";

const API = "http://localhost:3001";

// Agenda da página inicial: eventos que a escola abriu ao público.
// Funciona sem login; só mostra o que o administrador marcou como "Divulgar ao público".
export default function AgendaPublica() {
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [aberta, setAberta] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(false);
    try {
      const resposta = await fetch(`${API}/eventos-publicos`);
      if (!resposta.ok) throw new Error();
      const dados = await resposta.json();
      setEventos(dados.map(prepararPublicacao));
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <section id="section-eventos" className="agenda" aria-labelledby="agenda-titulo">
      <header className="agenda-cabecalho">
        <img src={bolinhas} alt="" className="agenda-bolinhas" />
        <h2 id="agenda-titulo" className="agenda-titulo">
          Agenda de eventos<span>.</span>
        </h2>
        <p className="agenda-texto">
          Palestras, feiras e atividades da ETEC de Campo Limpo Paulista abertas à
          comunidade. Escolha um dia no calendário para ver os detalhes.
        </p>
      </header>

      {carregando ? (
        <p className="agenda-status" role="status">Carregando eventos...</p>
      ) : erro ? (
        <div className="agenda-status" role="alert">
          <p>Não foi possível carregar os eventos agora.</p>
          <button type="button" className="agenda-tentar" onClick={carregar}>
            Tentar novamente
          </button>
        </div>
      ) : eventos.length === 0 ? (
        <p className="agenda-status">
          Nenhum evento público no momento. Volte em breve!
        </p>
      ) : (
        <Calendario
          publicacoes={eventos}
          onAbrir={(pub) => setAberta(pub)}
          substantivo={["evento", "eventos", "Nenhum"]}
        />
      )}

      <PublicacaoModal publicacao={aberta} onClose={() => setAberta(null)} />
    </section>
  );
}
