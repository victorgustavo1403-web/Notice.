import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowDownRight, ArrowUpRight, Check, ChevronDown, Download, Eye, FileText, Search, Users, X, Activity,
} from "lucide-react";
import Dropdown from "./Dropdown.jsx";
import Avatar from "./ui/Avatar.jsx";
import { obterToken } from "./sessao.js";
import { corDaCategoria } from "./categoriaCores.js";
import { useTema } from "./ui/Tema.jsx";
import bolinhas from "./assets/img/bolinhas.png";
import "./styles/relatorio-acessos.css";

const API = "http://localhost:3001";
const COR_NEUTRA = "#8d8d92";
const POR_PAGINA = 10;

const NOMES_TIPO = {
  comum: "Alunos",
  professor: "Professores",
  coordenacao: "Coordenação",
  administrador: "Administradores",
  super_admin: "Super admin",
};

const PERIODOS = [
  { valor: "7", rotulo: "7 dias" },
  { valor: "30", rotulo: "30 dias" },
  { valor: "90", rotulo: "90 dias" },
  { valor: "personalizado", rotulo: "Personalizado" },
];

const ORDENS = [
  { value: "visualizacoes", label: "Mais vistos" },
  { value: "alcance", label: "Maior alcance" },
  { value: "menor-alcance", label: "Menor alcance" },
  { value: "recentes", label: "Mais recentes" },
];

// ---------- utilitários ----------
const hojeSP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const somarDias = (dia, n) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const diaCurto = (dia) => (dia ? `${dia.slice(8, 10)}/${dia.slice(5, 7)}` : "");
const diaLongo = (dia) => (dia ? `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}` : "");
// datas do SQLite vêm em UTC
const dataHora = (v) => {
  if (!v) return "";
  const d = new Date(`${v.replace(" ", "T")}Z`);
  return isNaN(d) ? "" : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const dataPub = (v) => {
  if (!v) return "";
  const d = new Date(`${v.replace(" ", "T")}Z`);
  return isNaN(d) ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
};
const numero = (n) => (n ?? 0).toLocaleString("pt-BR");
const semAcento = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const corCat = (c) => corDaCategoria(c) ?? COR_NEUTRA;

async function pedir(caminho) {
  let r;
  try {
    r = await fetch(`${API}${caminho}`, { headers: { Authorization: `Bearer ${obterToken()}` } });
  } catch {
    throw new Error("Não foi possível conectar ao servidor.");
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.erro || "Não foi possível carregar o relatório.");
  }
  return r;
}

async function baixarCsv(caminho, nome) {
  const r = await pedir(caminho);
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

// variação em relação ao período anterior
function Variacao({ atual, anterior }) {
  if (!anterior) {
    return <span className="ra-var ra-var-neutra">{atual ? "sem dados antes" : "—"}</span>;
  }
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  if (pct === 0) return <span className="ra-var ra-var-neutra">igual ao anterior</span>;
  const sobe = pct > 0;
  return (
    <span className={`ra-var ${sobe ? "ra-var-sobe" : "ra-var-desce"}`} title="Comparado ao período anterior de mesmo tamanho">
      {sobe ? <ArrowUpRight size={14} strokeWidth={2.6} /> : <ArrowDownRight size={14} strokeWidth={2.6} />}
      {Math.abs(pct)}%
    </span>
  );
}

function Indicador({ icone: Icone, rotulo, valor, detalhe, atual, anterior }) {
  return (
    <div className="ra-kpi">
      <div className="ra-kpi-topo">
        <span className="ra-kpi-icone" aria-hidden="true"><Icone size={16} strokeWidth={2.4} /></span>
        <span className="ra-kpi-rotulo">{rotulo}</span>
      </div>
      <strong className="ra-kpi-valor">{valor}</strong>
      <div className="ra-kpi-base">
        <small>{detalhe}</small>
        {anterior !== undefined && <Variacao atual={atual} anterior={anterior} />}
      </div>
    </div>
  );
}

function DicaGrafico({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ra-dica">
      <strong>{diaLongo(label)}</strong>
      {payload.map((p) => (
        <span key={p.dataKey}><i style={{ background: p.color }} />{p.name}: <b>{numero(p.value)}</b></span>
      ))}
    </div>
  );
}

function Alcance({ valor, cor }) {
  return (
    <span className="ra-alcance" title={`${valor}% de quem pode ver a categoria`}>
      <span className="ra-alcance-barra"><i style={{ width: `${Math.min(valor, 100)}%`, background: cor }} /></span>
      <b>{valor}%</b>
    </span>
  );
}

export default function RelatorioAcessos() {
  const { tema } = useTema();
  const escuro = tema === "escuro";
  const [periodo, setPeriodo] = useState("30");
  const [inicio, setInicio] = useState(() => somarDias(hojeSP(), -29));
  const [fim, setFim] = useState(hojeSP);
  const [categoria, setCategoria] = useState("");
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("visualizacoes");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [series, setSeries] = useState({ visualizacoes: true, pessoas: true, logins: false });
  const [detalheId, setDetalheId] = useState(null);
  const [exportando, setExportando] = useState("");

  const consulta = useMemo(() => {
    const q = new URLSearchParams();
    if (periodo === "personalizado") { q.set("inicio", inicio); q.set("fim", fim); }
    else q.set("dias", periodo);
    if (categoria) q.set("categoria", categoria);
    return q.toString();
  }, [periodo, inicio, fim, categoria]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro("");
    pedir(`/relatorios/acessos?${consulta}`)
      .then((r) => r.json())
      .then((d) => { if (ativo) { setDados(d); setLimite(POR_PAGINA); } })
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false));
    return () => { ativo = false; };
  }, [consulta]);

  const exportar = async (tipo) => {
    setExportando(tipo);
    try {
      if (tipo === "avisos") await baixarCsv(`/relatorios/acessos/csv?${consulta}`, `avisos-${dados?.periodo.inicio}-a-${dados?.periodo.fim}.csv`);
      else await baixarCsv("/relatorios/usuarios/csv", "usuarios-acessos.csv");
    } catch (e) {
      setErro(e.message);
    } finally {
      setExportando("");
    }
  };

  const avisos = useMemo(() => {
    if (!dados) return [];
    const termo = semAcento(busca.trim());
    const lista = dados.avisos.filter((a) => !termo || semAcento(`${a.titulo} ${a.categoria} ${a.autor ?? ""}`).includes(termo));
    const ordenar = {
      visualizacoes: (a, b) => b.visualizacoes - a.visualizacoes || b.pessoas - a.pessoas,
      alcance: (a, b) => b.alcance - a.alcance || b.visualizacoes - a.visualizacoes,
      "menor-alcance": (a, b) => a.alcance - b.alcance || (b.publicado_em ?? "").localeCompare(a.publicado_em ?? ""),
      recentes: (a, b) => (b.publicado_em ?? "").localeCompare(a.publicado_em ?? ""),
    }[ordem];
    return [...lista].sort(ordenar);
  }, [dados, busca, ordem]);

  const cores = {
    texto: escuro ? "#b9b8b2" : "#777777",
    grade: escuro ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
    principal: escuro ? "#f5f4ee" : "#333333",
    pessoas: "#0064af",
    logins: escuro ? "#8d8d92" : "#a8a8ad",
  };

  const opcoesCategoria = [
    { value: "", label: "Todas as categorias" },
    ...(dados?.porCategoria ?? []).map((c) => ({ value: c.categoria, label: c.categoria, cor: corCat(c.categoria) })),
  ];

  // ---------- render ----------
  const cabecalho = (
    <header className="ra-cabecalho">
      <div>
        <img src={bolinhas} alt="" className="ra-bolinhas" />
        <h2 className="ra-titulo">Relatório de acessos.</h2>
        <p className="ra-subtitulo">
          Como os avisos estão sendo lidos
          {dados && <> · <b>{diaLongo(dados.periodo.inicio)}</b> a <b>{diaLongo(dados.periodo.fim)}</b></>}
          {categoria && <> · {categoria}</>}
        </p>
      </div>
      <div className="ra-exportar-grupo">
        <button type="button" className="ra-exportar" onClick={() => exportar("avisos")} disabled={!dados || !!exportando}>
          <Download size={16} strokeWidth={2.4} />{exportando === "avisos" ? "Gerando..." : "Avisos (CSV)"}
        </button>
        <button type="button" className="ra-exportar ra-exportar-sec" onClick={() => exportar("usuarios")} disabled={!!exportando}>
          <Download size={16} strokeWidth={2.4} />{exportando === "usuarios" ? "Gerando..." : "Usuários (CSV)"}
        </button>
      </div>
    </header>
  );

  const filtros = (
    <div className="ra-filtros">
      <div className="ra-segmentos" role="radiogroup" aria-label="Período">
        {PERIODOS.map((p) => (
          <button
            key={p.valor}
            type="button"
            role="radio"
            aria-checked={periodo === p.valor}
            className={periodo === p.valor ? "ativo" : ""}
            onClick={() => setPeriodo(p.valor)}
          >
            {p.rotulo}
          </button>
        ))}
      </div>
      {periodo === "personalizado" && (
        <div className="ra-datas">
          <label><span>De</span><input type="date" value={inicio} max={fim} onChange={(e) => e.target.value && setInicio(e.target.value)} /></label>
          <label><span>até</span><input type="date" value={fim} min={inicio} max={hojeSP()} onChange={(e) => e.target.value && setFim(e.target.value)} /></label>
        </div>
      )}
      <Dropdown
        variant="pilula"
        className="ra-filtro-categoria"
        ariaLabel="Filtrar por categoria"
        value={categoria}
        onChange={setCategoria}
        options={opcoesCategoria}
      />
    </div>
  );

  if (!dados) {
    return (
      <div className="ra-pagina">
        {cabecalho}
        {filtros}
        <p className="ra-msg" role={erro ? "alert" : undefined}>{erro || "Carregando relatório..."}</p>
      </div>
    );
  }

  const { resumo, serie, porCategoria, porTipo, porHora, naoAcessaram } = dados;
  const maxCat = Math.max(1, ...porCategoria.map((c) => c.visualizacoes));
  const maxTipo = Math.max(1, ...porTipo.map((t) => t.contas));
  const maxHora = Math.max(1, ...porHora.map((h) => h.visualizacoes));
  const pico = porHora.reduce((m, h) => (h.visualizacoes > m.visualizacoes ? h : m), porHora[0]);
  const semDados = resumo.visualizacoes === 0;
  const intervaloTicks = Math.max(0, Math.ceil(serie.length / 8) - 1);

  return (
    <div className={`ra-pagina ${carregando ? "ra-carregando" : ""}`}>
      {cabecalho}
      {filtros}
      {erro && <p className="ra-erro" role="alert">{erro}</p>}

      {/* ---------- indicadores ---------- */}
      <section className="ra-kpis" aria-label="Resumo do período">
        <Indicador
          icone={Eye} rotulo="Visualizações" valor={numero(resumo.visualizacoes)}
          detalhe={`${numero(resumo.avisos)} ${resumo.avisos === 1 ? "aviso visto" : "avisos vistos"}`}
          atual={resumo.visualizacoes} anterior={resumo.anterior.visualizacoes}
        />
        <Indicador
          icone={Users} rotulo="Pessoas alcançadas" valor={numero(resumo.pessoas)}
          detalhe={`de ${numero(resumo.totalUsuarios)} contas`}
          atual={resumo.pessoas} anterior={resumo.anterior.pessoas}
        />
        <Indicador
          icone={FileText} rotulo="Avisos publicados" valor={numero(resumo.publicados)}
          detalhe={`${numero(resumo.lidas)} marcados como lidos`}
          atual={resumo.publicados} anterior={resumo.anterior.publicados}
        />
        <Indicador
          icone={Activity} rotulo="Usuários ativos" valor={numero(resumo.ativos)}
          detalhe={`${numero(resumo.logins)} logins`}
          atual={resumo.ativos} anterior={resumo.anterior.ativos}
        />
      </section>

      {/* ---------- evolução ---------- */}
      <section className="ra-bloco">
        <div className="ra-bloco-topo">
          <h3>Visualizações por dia</h3>
          <div className="ra-legenda" role="group" aria-label="Linhas do gráfico">
            {[
              ["visualizacoes", "Visualizações", cores.principal],
              ["pessoas", "Pessoas", cores.pessoas],
              ["logins", "Logins", cores.logins],
            ].map(([chave, rotulo, cor]) => (
              <button
                key={chave}
                type="button"
                aria-pressed={series[chave]}
                className={series[chave] ? "ativo" : ""}
                onClick={() => setSeries((s) => ({ ...s, [chave]: !s[chave] }))}
              >
                <i style={{ background: cor }} />{rotulo}
              </button>
            ))}
          </div>
        </div>
        <div className="ra-grafico">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="ra-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cores.principal} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={cores.principal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={cores.grade} vertical={false} />
              <XAxis dataKey="dia" tickFormatter={diaCurto} tick={{ fill: cores.texto, fontSize: 12 }} axisLine={false} tickLine={false} interval={intervaloTicks} />
              <YAxis allowDecimals={false} tick={{ fill: cores.texto, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DicaGrafico />} cursor={{ stroke: cores.grade, strokeWidth: 2 }} />
              {series.visualizacoes && <Area type="monotone" dataKey="visualizacoes" name="Visualizações" stroke={cores.principal} strokeWidth={2.4} fill="url(#ra-area)" dot={false} activeDot={{ r: 4 }} />}
              {series.pessoas && <Line type="monotone" dataKey="pessoas" name="Pessoas" stroke={cores.pessoas} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />}
              {series.logins && <Line type="monotone" dataKey="logins" name="Logins" stroke={cores.logins} strokeWidth={2} strokeDasharray="5 5" dot={false} />}
            </ComposedChart>
          </ResponsiveContainer>
          {semDados && <p className="ra-grafico-vazio">Nenhum aviso foi aberto neste período.</p>}
        </div>
      </section>

      <div className="ra-colunas">
        {/* ---------- por categoria ---------- */}
        <section className="ra-bloco">
          <div className="ra-bloco-topo">
            <h3>Por categoria</h3>
            <small>clique para filtrar</small>
          </div>
          <ul className="ra-categorias">
            {porCategoria.map((c) => {
              const ativa = categoria === c.categoria;
              return (
                <li key={c.categoria}>
                  <button
                    type="button"
                    className={`ra-categoria ${ativa ? "ativa" : ""} ${categoria && !ativa ? "apagada" : ""}`}
                    onClick={() => setCategoria(ativa ? "" : c.categoria)}
                    aria-pressed={ativa}
                  >
                    <span className="ra-categoria-nome"><i style={{ background: corCat(c.categoria) }} />{c.categoria}</span>
                    <span className="ra-categoria-barra"><i style={{ width: `${(c.visualizacoes / maxCat) * 100}%`, background: corCat(c.categoria) }} /></span>
                    <span className="ra-categoria-numeros">
                      <span><b>{numero(c.visualizacoes)}</b> {c.visualizacoes === 1 ? "visualização" : "visualizações"}</span>
                      <small>{numero(c.pessoas)} pessoas · {numero(c.publicados)} publicados</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="ra-coluna-direita">
          {/* ---------- quem lê ---------- */}
          <section className="ra-bloco">
            <div className="ra-bloco-topo">
              <h3>Quem lê</h3>
              <small>pessoas que abriram avisos / contas</small>
            </div>
            <ul className="ra-tipos">
              {porTipo.map((t) => (
                <li key={t.tipo}>
                  <span className="ra-tipo-nome">{NOMES_TIPO[t.tipo] ?? t.tipo}</span>
                  <span className="ra-tipo-barra" style={{ width: `${(t.contas / maxTipo) * 100}%` }}>
                    <i style={{ width: `${t.contas ? (t.pessoas / t.contas) * 100 : 0}%` }} />
                  </span>
                  <span className="ra-tipo-num"><b>{t.pessoas}</b>/{t.contas}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ---------- horário ---------- */}
          <section className="ra-bloco">
            <div className="ra-bloco-topo">
              <h3>Horário de leitura</h3>
              {!semDados && <small>pico às <b>{String(pico.hora).padStart(2, "0")}h</b></small>}
            </div>
            <div className="ra-horas" role="img" aria-label={semDados ? "Sem visualizações no período" : `Mais visualizações às ${pico.hora} horas`}>
              {porHora.map((h) => (
                <span
                  key={h.hora}
                  className={`ra-hora ${!semDados && h.hora === pico.hora ? "pico" : ""}`}
                  title={`${String(h.hora).padStart(2, "0")}h: ${h.visualizacoes} visualizações`}
                >
                  <i style={{ height: `${Math.max((h.visualizacoes / maxHora) * 100, h.visualizacoes ? 6 : 2)}%` }} />
                </span>
              ))}
            </div>
            <div className="ra-horas-eixo" aria-hidden="true"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>
          </section>
        </div>
      </div>

      {/* ---------- cada aviso ---------- */}
      <section className="ra-bloco">
        <div className="ra-bloco-topo ra-avisos-topo">
          <h3>Avisos <span className="ra-contagem">{avisos.length}</span></h3>
          <div className="ra-avisos-filtros">
            <label className="ra-busca">
              <Search size={16} strokeWidth={2.4} aria-hidden="true" />
              <input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setLimite(POR_PAGINA); }} placeholder="Buscar aviso" aria-label="Buscar aviso" />
            </label>
            <Dropdown variant="pilula" className="ra-ordem" ariaLabel="Ordenar avisos" value={ordem} onChange={setOrdem} options={ORDENS} />
          </div>
        </div>

        {avisos.length === 0 ? (
          <p className="ra-msg">{busca ? "Nenhum aviso encontrado." : "Nenhum aviso publicado ou visto neste período."}</p>
        ) : (
          <>
            <div className="ra-tabela" role="table" aria-label="Visualizações por aviso">
              <div className="ra-linha ra-linha-cabecalho" role="row">
                <span role="columnheader">Aviso</span>
                <span role="columnheader">Visualiz.</span>
                <span role="columnheader">Pessoas</span>
                <span role="columnheader">Alcance</span>
                <span role="columnheader">Lido</span>
              </div>
              {avisos.slice(0, limite).map((a) => (
                <button key={a.id} type="button" className="ra-linha ra-aviso-linha" role="row" onClick={() => setDetalheId(a.id)}>
                  <span className="ra-aviso" role="cell">
                    <i style={{ background: corCat(a.categoria) }} aria-hidden="true" />
                    <span>
                      <strong>{a.titulo}</strong>
                      <small>
                        {a.categoria}
                        {a.publicado_em && <> · {dataPub(a.publicado_em)}</>}
                        {a.removido && <em className="ra-removido">removido</em>}
                      </small>
                    </span>
                  </span>
                  <span role="cell" className="ra-num" data-rotulo="Visualizações">{numero(a.visualizacoes)}</span>
                  <span role="cell" className="ra-num" data-rotulo="Pessoas">{numero(a.pessoas)}</span>
                  <span role="cell" data-rotulo="Alcance"><Alcance valor={a.alcance} cor={corCat(a.categoria)} /></span>
                  <span role="cell" className="ra-num" data-rotulo="Lido">{a.lidas ?? "—"}</span>
                </button>
              ))}
            </div>
            {avisos.length > limite && (
              <button type="button" className="ra-mais" onClick={() => setLimite((l) => l + POR_PAGINA)}>
                Mostrar mais {Math.min(POR_PAGINA, avisos.length - limite)} <ChevronDown size={16} />
              </button>
            )}
          </>
        )}
        <p className="ra-nota">
          <b>Alcance</b> = pessoas que abriram o aviso ÷ contas que podem ver a categoria. Reabrir o mesmo aviso em menos de 30 minutos não conta de novo.
        </p>
      </section>

      {/* ---------- contas paradas ---------- */}
      <details className="ra-bloco ra-nunca">
        <summary>
          <h3>Contas que nunca acessaram</h3>
          <span className="ra-contagem">{naoAcessaram.length}</span>
          <ChevronDown size={18} className="ra-nunca-seta" aria-hidden="true" />
        </summary>
        {naoAcessaram.length === 0 ? (
          <p className="ra-msg">Todos os usuários já acessaram o sistema.</p>
        ) : (
          <ul className="ra-nunca-lista">
            {naoAcessaram.map((u) => (
              <li key={u.rm}><b>{u.nome}</b><span>RM {u.rm} · {NOMES_TIPO[u.tipo] ?? u.tipo}</span></li>
            ))}
          </ul>
        )}
      </details>

      {detalheId && <DetalheAviso id={detalheId} cores={cores} onFechar={() => setDetalheId(null)} />}
    </div>
  );
}

// ---------- painel de um aviso: quem viu e quando ----------
function DetalheAviso({ id, cores, onFechar }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    pedir(`/relatorios/avisos/${id}`).then((r) => r.json()).then((d) => ativo && setDados(d)).catch((e) => ativo && setErro(e.message));
    return () => { ativo = false; };
  }, [id]);

  useEffect(() => {
    const aoTeclar = (e) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", aoTeclar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", aoTeclar); document.body.style.overflow = anterior; };
  }, [onFechar]);

  const cor = corCat(dados?.aviso.categoria);

  return createPortal(
    <div className="ra-detalhe-fundo" onClick={onFechar}>
      <aside className="ra-detalhe" role="dialog" aria-modal="true" aria-label="Detalhes do aviso" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ra-detalhe-fechar" onClick={onFechar} aria-label="Fechar"><X size={20} strokeWidth={2.4} /></button>

        {!dados && <p className="ra-msg">{erro || "Carregando..."}</p>}

        {dados && (
          <>
            <span className="ra-detalhe-cat"><i style={{ background: cor }} />{dados.aviso.categoria}{dados.aviso.removido && <em className="ra-removido">removido</em>}</span>
            <h3 className="ra-detalhe-titulo">{dados.aviso.titulo}</h3>
            <p className="ra-detalhe-meta">
              {dados.aviso.publicado_em ? <>Publicado em {dataHora(dados.aviso.publicado_em)}</> : "Já saiu do sistema"}
              {dados.aviso.autor && <> · por {dados.aviso.autor}</>}
            </p>

            <div className="ra-detalhe-kpis">
              <div><strong>{numero(dados.visualizacoes)}</strong><span>visualizações</span></div>
              <div><strong>{numero(dados.pessoas.length)}</strong><span>pessoas</span></div>
              <div><strong>{dados.alcance}%</strong><span>alcance ({dados.publico} contas)</span></div>
              <div><strong>{numero(dados.lidas)}</strong><span>marcaram como lido</span></div>
            </div>

            {dados.serie.length > 0 && (
              <div className="ra-detalhe-grafico">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dados.serie} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                    <CartesianGrid stroke={cores.grade} vertical={false} />
                    <XAxis dataKey="dia" tickFormatter={diaCurto} tick={{ fill: cores.texto, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: cores.texto, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DicaGrafico />} cursor={{ fill: cores.grade }} />
                    <Area type="monotone" dataKey="visualizacoes" name="Visualizações" stroke={cor} strokeWidth={2.4} fill={cor} fillOpacity={0.15} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {dados.porTipo.length > 0 && (
              <div className="ra-detalhe-tipos">
                {dados.porTipo.map((t) => (
                  <span key={t.tipo ?? "x"}>{NOMES_TIPO[t.tipo] ?? "Conta excluída"} <b>{t.pessoas}</b></span>
                ))}
              </div>
            )}

            <h4 className="ra-detalhe-sub">Quem abriu <span className="ra-contagem">{dados.pessoas.length}</span></h4>
            {dados.pessoas.length === 0 ? (
              <p className="ra-msg">Ninguém abriu este aviso ainda.</p>
            ) : (
              <ul className="ra-pessoas">
                {dados.pessoas.map((p) => (
                  <li key={p.id}>
                    <Avatar usuario={p} tamanho={36} />
                    <span className="ra-pessoa">
                      <b>{p.nome}</b>
                      <small>{NOMES_TIPO[p.tipo] ?? p.tipo} · RM {p.rm}</small>
                    </span>
                    <span className="ra-pessoa-quando">
                      <small>{dataHora(p.primeira)}</small>
                      {p.vezes > 1 && <small>{p.vezes} vezes</small>}
                    </span>
                    {p.lida
                      ? <span className="ra-lido" title="Marcou como lido"><Check size={14} strokeWidth={3} /></span>
                      : <span className="ra-lido ra-lido-nao" title="Não marcou como lido" />}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
