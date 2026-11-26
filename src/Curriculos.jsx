import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, ExternalLink, FileText, Inbox, Mail, Phone, Search, Trash2 } from "lucide-react";
import NavBar from "./Nav-bar.jsx";
import Avatar from "./ui/Avatar.jsx";
import Dropdown from "./Dropdown.jsx";
import { useAvisos } from "./ui/Avisos.jsx";
import { ConfirmarDialogo } from "./ui/Dialogo.jsx";
import { useRolagemSuave } from "./ui/useRolagemSuave.js";
import { abrirCurriculo, descartarCurriculo, formatarEnvio, formatarTamanho, listarCurriculos } from "./curriculos.js";
import bolinhas from "./assets/img/bolinhas.png";
import "./styles/curriculos.css";

const semAcento = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Currículos enviados pelos alunos nas vagas de emprego (administradores e super admin)
export default function Curriculos() {
  useRolagemSuave();
  const avisos = useAvisos();
  const [params, setParams] = useSearchParams();
  const [lista, setLista] = useState(null); // null = carregando
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [descartar, setDescartar] = useState(null);
  const [descartando, setDescartando] = useState(false);
  const vaga = params.get("vaga") ?? "";

  const carregar = async () => {
    setErro("");
    try {
      setLista(await listarCurriculos());
    } catch (e) {
      setErro(e.message);
      setLista((l) => l ?? []);
    }
  };
  useEffect(() => { carregar(); }, []);

  const vagas = useMemo(() => {
    const mapa = new Map();
    (lista ?? []).forEach((c) => {
      const v = mapa.get(c.vaga_id) ?? { id: c.vaga_id, titulo: c.vaga_titulo, total: 0 };
      v.total += 1;
      mapa.set(c.vaga_id, v);
    });
    return [...mapa.values()].sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  }, [lista]);

  const filtrados = useMemo(() => {
    const termo = semAcento(busca.trim());
    return (lista ?? []).filter((c) =>
      (!vaga || String(c.vaga_id) === vaga) &&
      (!termo || semAcento(`${c.aluno_nome} ${c.aluno_rm} ${c.aluno_email ?? ""}`).includes(termo)),
    );
  }, [lista, busca, vaga]);

  // agrupa por vaga, mantendo a ordem dos envios mais recentes
  const grupos = useMemo(() => {
    const mapa = new Map();
    filtrados.forEach((c) => {
      if (!mapa.has(c.vaga_id)) mapa.set(c.vaga_id, { id: c.vaga_id, titulo: c.vaga_titulo, itens: [] });
      mapa.get(c.vaga_id).itens.push(c);
    });
    return [...mapa.values()];
  }, [filtrados]);

  const total = lista?.length ?? 0;
  const novos = (lista ?? []).filter((c) => !c.visto_em).length;

  const abrir = async (c, modo) => {
    try {
      await abrirCurriculo(c.id, c.nome_original, modo);
      if (!c.visto_em) {
        setLista((l) => l.map((x) => (x.id === c.id ? { ...x, visto_em: "agora" } : x)));
      }
    } catch (e) {
      avisos?.erro(e.message);
    }
  };

  const confirmarDescarte = async () => {
    setDescartando(true);
    try {
      const dados = await descartarCurriculo(descartar.id);
      setLista((l) => l.filter((x) => x.id !== descartar.id));
      avisos?.sucesso(dados.mensagem);
      setDescartar(null);
    } catch (e) {
      avisos?.erro(e.message);
    } finally {
      setDescartando(false);
    }
  };

  const mudarVaga = (valor) => {
    const novo = new URLSearchParams(params);
    if (valor) novo.set("vaga", valor); else novo.delete("vaga");
    setParams(novo, { replace: true });
  };

  return (
    <div className="cvs-pagina">
      <NavBar />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main className="cvs-conteudo">
            <header className="cvs-cabecalho">
              <img src={bolinhas} alt="" className="cvs-bolinhas" />
              <h1 className="cvs-titulo">Currículos.</h1>
              <p className="cvs-subtitulo">
                O que os alunos enviaram para as vagas de emprego. Os currículos são apagados junto com a vaga,
                quando ela sai do sistema (30 dias depois de publicada).
              </p>
            </header>

            <section className="cvs-numeros" aria-label="Resumo">
              <div className="cvs-numero"><strong>{total}</strong><span>currículos</span></div>
              <div className="cvs-numero"><strong>{novos}</strong><span>{novos === 1 ? "ainda não aberto" : "ainda não abertos"}</span></div>
              <div className="cvs-numero"><strong>{vagas.length}</strong><span>{vagas.length === 1 ? "vaga com candidatos" : "vagas com candidatos"}</span></div>
            </section>

            <div className="cvs-filtros">
              <label className="cvs-busca">
                <Search size={18} strokeWidth={2.2} aria-hidden="true" />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, RM ou e-mail"
                  aria-label="Buscar aluno"
                />
              </label>
              <Dropdown
                variant="pilula"
                value={vaga}
                onChange={mudarVaga}
                ariaLabel="Filtrar por vaga"
                className="cvs-vaga"
                options={[
                  { value: "", label: "Todas as vagas" },
                  ...vagas.map((v) => ({ value: String(v.id), label: `${v.titulo} (${v.total})`, cor: "#EDBE03" })),
                ]}
              />
            </div>

            {erro && (
              <div className="cvs-erro" role="alert">
                <span>{erro}</span>
                <button type="button" className="btn btn-secundario" onClick={carregar}>Tentar de novo</button>
              </div>
            )}

            {lista === null && <p className="cvs-vazio">Carregando currículos…</p>}

            {lista !== null && !erro && grupos.length === 0 && (
              <div className="cvs-vazio">
                <Inbox size={34} strokeWidth={1.8} aria-hidden="true" />
                <strong>{total === 0 ? "Nenhum currículo recebido ainda" : "Nenhum currículo encontrado"}</strong>
                <span>{total === 0 ? "Quando um aluno se candidatar a uma vaga, o currículo aparece aqui." : "Tente outro nome ou escolha outra vaga."}</span>
              </div>
            )}

            {grupos.map((g) => (
              <section key={g.id} className="cvs-grupo" aria-label={`Vaga: ${g.titulo}`}>
                <h2 className="cvs-grupo-titulo">
                  <i aria-hidden="true" />
                  {g.titulo}
                  <span>{g.itens.length}</span>
                </h2>
                <ul className="cvs-lista">
                  {g.itens.map((c) => (
                    <li key={c.id} className="cvs-item">
                      <Avatar usuario={{ nome: c.aluno_nome, tipo: "comum", foto_url: c.aluno_foto }} tamanho={48} />
                      <div className="cvs-aluno">
                        <div className="cvs-nome">
                          <strong>{c.aluno_nome}</strong>
                          {!c.visto_em && <span className="cvs-novo">Novo</span>}
                        </div>
                        <div className="cvs-contatos">
                          <span>RM {c.aluno_rm}</span>
                          {c.aluno_email && <a href={`mailto:${c.aluno_email}`}><Mail size={14} aria-hidden="true" />{c.aluno_email}</a>}
                          {c.aluno_telefone && <a href={`tel:${c.aluno_telefone}`}><Phone size={14} aria-hidden="true" />{c.aluno_telefone}</a>}
                        </div>
                        {c.mensagem && <p className="cvs-recado">“{c.mensagem}”</p>}
                      </div>
                      <div className="cvs-lado">
                        <small className="cvs-data">Enviado em {formatarEnvio(c.enviado_em)}</small>
                        <span className="cvs-arquivo" title={c.nome_original}>
                          <FileText size={14} aria-hidden="true" />
                          <span>{c.nome_original}</span>
                          <small>{formatarTamanho(c.tamanho)}</small>
                        </span>
                        <div className="cvs-acoes">
                          <button type="button" className="btn btn-primario" onClick={() => abrir(c, "abrir")}>
                            <ExternalLink size={16} aria-hidden="true" />Abrir
                          </button>
                          <button type="button" className="cvs-icone" onClick={() => abrir(c, "baixar")} title="Baixar PDF" aria-label={`Baixar currículo de ${c.aluno_nome}`}>
                            <Download size={18} />
                          </button>
                          <button type="button" className="cvs-icone cvs-icone-perigo" onClick={() => setDescartar(c)} title="Descartar" aria-label={`Descartar currículo de ${c.aluno_nome}`}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </main>
        </div>
      </div>

      {descartar && (
        <ConfirmarDialogo
          titulo="Descartar currículo?"
          texto={`O currículo de ${descartar.aluno_nome} para "${descartar.vaga_titulo}" será apagado. Esta ação não pode ser desfeita.`}
          rotuloConfirmar="Descartar"
          rotuloCarregando="Descartando..."
          carregando={descartando}
          onConfirmar={confirmarDescarte}
          onCancelar={() => setDescartar(null)}
        />
      )}
    </div>
  );
}
