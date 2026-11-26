import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "./AuthContext.jsx";
import CardPublicacao from "./CardPublicacao.jsx";
import { corDaCategoria, normalizarCategoria } from "./categoriaCores.js";
import { chaveData, dataDoEvento, hojeChave } from "./datas.js";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Ordem das bolinhas (a mesma da navbar) e legenda de cores
const ORDEM = ["geral", "eventos", "vagas de emprego", "coordenacao", "secretaria", "area do professor", "area dos funcionarios"];
const LEGENDA = [
  { nome: "Geral" },
  { nome: "Eventos" },
  { nome: "Vagas de Emprego" },
  { nome: "Coordenação" },
  { nome: "Secretaria" },
  { nome: "Área do professor" },
  { nome: "Área dos funcionários" },
].map((c) => ({ ...c, cor: corDaCategoria(c.nome) }));
const COR_OUTRAS = "#333333"; // publicações antigas da categoria Anexos

// A legenda só mostra as áreas restritas que o perfil pode ver
function legendaVisivel(nome, tipo) {
  const n = normalizarCategoria(nome);
  if (n === "area do professor") return ["professor", "coordenacao", "administrador", "super_admin"].includes(tipo);
  if (n === "area dos funcionarios") return ["coordenacao", "administrador", "super_admin"].includes(tipo);
  return true;
}

function gerarDiasDoMes(ano, mes) {
  const dias = [];
  for (let i = 0; i < new Date(ano, mes, 1).getDay(); i++) dias.push(null);
  for (let d = 1; d <= new Date(ano, mes + 1, 0).getDate(); d++) {
    dias.push(new Date(ano, mes, d));
  }
  return dias;
}

// Categorias distintas de um dia, na ordem da navbar
function categoriasDoDia(lista) {
  const vistas = new Map();
  for (const pub of lista) {
    const chave = normalizarCategoria(pub.categoria);
    if (!vistas.has(chave)) {
      vistas.set(chave, { nome: pub.categoria, cor: corDaCategoria(pub.categoria) ?? COR_OUTRAS });
    }
  }
  const posicao = (n) => {
    const i = ORDEM.indexOf(normalizarCategoria(n));
    return i === -1 ? ORDEM.length : i;
  };
  return [...vistas.values()].sort((a, b) => posicao(a.nome) - posicao(b.nome));
}

/**
 * Calendário de Anexos: reúne TODAS as publicações que têm data de evento, de qualquer
 * categoria. Cada dia mostra bolinhas com as cores das categorias publicadas nele.
 * Quem publica (podeCriar) cadastra direto pelo dia: botão "+" ao passar o mouse no dia
 * e botão "Nova publicação" no painel do dia selecionado. Datas que já passaram não aceitam
 * novas publicações.
 */
export default function Calendario({
  publicacoes,
  onAbrir,
  renderAcoes,
  podeCriar = false,
  onNova,
  foco = null,
  substantivo = ["publicação", "publicações", "Nenhuma"],
}) {
  const [um, varios, nenhum] = substantivo;
  const { user } = useAuth();
  const hojeChaveAtual = hojeChave();
  const hoje = dataDoEvento(hojeChaveAtual);

  const [mesAtual, setMesAtual] = useState(hoje.getMonth());
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [diaSelecionado, setDiaSelecionado] = useState(hojeChaveAtual);

  const publicacoesPorDia = useMemo(() => {
    const mapa = {};
    for (const pub of publicacoes) {
      if (!pub.data_evento) continue;
      const chave = String(pub.data_evento).slice(0, 10);
      (mapa[chave] ??= []).push(pub);
    }
    return mapa;
  }, [publicacoes]);

  const dias = useMemo(() => gerarDiasDoMes(anoAtual, mesAtual), [anoAtual, mesAtual]);

  // Depois de publicar, o calendário vai para o dia da publicação nova
  useEffect(() => {
    if (!foco?.dataEvento) return;
    const d = dataDoEvento(foco.dataEvento);
    if (!d) return;
    setMesAtual(d.getMonth());
    setAnoAtual(d.getFullYear());
    setDiaSelecionado(foco.dataEvento);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foco?.em]);

  const mudarMes = (delta) => {
    const d = new Date(anoAtual, mesAtual + delta, 1);
    setMesAtual(d.getMonth());
    setAnoAtual(d.getFullYear());
  };

  const irParaHoje = () => {
    setMesAtual(hoje.getMonth());
    setAnoAtual(hoje.getFullYear());
    setDiaSelecionado(hojeChaveAtual);
  };

  const selecionada = dataDoEvento(diaSelecionado);
  const doDia = publicacoesPorDia[diaSelecionado] || [];
  const selecionadoPassou = diaSelecionado < hojeChaveAtual;
  const textoContagem =
    doDia.length === 0
      ? `${nenhum} ${um}`
      : doDia.length === 1
        ? `1 ${um}`
        : `${doDia.length} ${varios}`;

  return (
    <div className="calendario-wrapper">
      <div className="calendario-header">
        <h2 className="calendario-mes-titulo" aria-live="polite">
          {MESES[mesAtual]} <span>{anoAtual}</span>
        </h2>

        <div className="calendario-controles">
          <button type="button" onClick={irParaHoje} className="calendario-hoje-btn">
            Hoje
          </button>
          <button type="button" onClick={() => mudarMes(-1)} className="calendario-nav-btn" aria-label="Mês anterior">
            <svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.5 1.5L2 7l5.5 5.5" /></svg>
          </button>
          <button type="button" onClick={() => mudarMes(1)} className="calendario-nav-btn" aria-label="Próximo mês">
            <svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 1.5L7 7l-5.5 5.5" /></svg>
          </button>
        </div>
      </div>

      <div className="calendario-grade" key={`${anoAtual}-${mesAtual}`}>
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="calendario-dia-semana">{dia}</div>
        ))}

        {dias.map((data, i) => {
          if (!data) return <div key={`vazio-${i}`} className="calendario-celula" />;

          const chave = chaveData(data);
          const lista = publicacoesPorDia[chave] || [];
          const categorias = categoriasDoDia(lista);
          const temPublicacao = lista.length > 0;
          const selecionado = chave === diaSelecionado;
          const passado = chave < hojeChaveAtual;
          // Dia que já passou só abre se tiver publicação (para não esconder o histórico)
          const bloqueado = passado && !temPublicacao;
          const extenso = data.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

          return (
            <div
              key={chave}
              className={
                "calendario-celula" +
                (selecionado ? " selecionada" : "") +
                (temPublicacao ? " com-bolinhas" : "")
              }
            >
              <button
                type="button"
                disabled={bloqueado}
                aria-pressed={selecionado}
                aria-label={
                  temPublicacao
                    ? `${extenso}, ${lista.length} ${lista.length === 1 ? um : varios}: ${categorias.map((c) => c.nome).join(", ")}`
                    : extenso
                }
                title={bloqueado ? "Data que já passou" : undefined}
                onClick={() => setDiaSelecionado(chave)}
                className={
                  "calendario-dia" +
                  (selecionado ? " calendario-dia-selecionado" : "") +
                  (chave === hojeChaveAtual ? " calendario-dia-hoje" : "") +
                  (passado ? " calendario-dia-passado" : "") +
                  (temPublicacao ? " calendario-dia-com-anexo" : "")
                }
              >
                {data.getDate()}
              </button>

              {temPublicacao && (
                <span className="calendario-bolinhas" aria-hidden="true">
                  {categorias.slice(0, 4).map((c) => (
                    <i key={c.nome} style={{ background: c.cor }} title={c.nome} />
                  ))}
                  {categorias.length > 4 && <b>+{categorias.length - 4}</b>}
                </span>
              )}

              {podeCriar && !passado && (
                <button
                  type="button"
                  className="calendario-add"
                  aria-label={`Nova publicação em ${extenso}`}
                  title="Nova publicação neste dia"
                  onClick={() => {
                    setDiaSelecionado(chave);
                    onNova?.(chave);
                  }}
                >
                  <Plus size={13} strokeWidth={3} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <ul className="calendario-legenda" aria-label="Cores das categorias">
        {LEGENDA.filter((c) => legendaVisivel(c.nome, user?.tipo)).map((c) => (
          <li key={c.nome}>
            <i style={{ background: c.cor }} />
            {c.nome}
          </li>
        ))}
      </ul>

      {/* ---- Publicações do dia selecionado ---- */}
      <section className="calendario-painel" aria-live="polite">
        <header className="calendario-painel-topo">
          <div>
            <span className="calendario-painel-semana">
              {selecionada?.toLocaleDateString("pt-BR", { weekday: "long" })}
              {diaSelecionado === hojeChaveAtual ? " · hoje" : ""}
            </span>
            <h3 className="calendario-painel-titulo">
              {selecionada?.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
            </h3>
            <span className="calendario-contagem">{textoContagem}</span>
          </div>

          {podeCriar && !selecionadoPassou && (
            <button type="button" className="calendario-nova" onClick={() => onNova?.(diaSelecionado)}>
              <Plus size={16} strokeWidth={2.6} />
              Nova publicação
            </button>
          )}
        </header>

        {doDia.length > 0 ? (
          <div className="categoria-grid">
            {doDia.map((pub) => (
              <CardPublicacao key={pub.id} pub={pub} onAbrir={onAbrir} acoes={renderAcoes?.(pub)} />
            ))}
          </div>
        ) : (
          <p className="calendario-vazio">
            {selecionadoPassou
              ? `${nenhum} ${um} nesta data.`
              : podeCriar
                ? `${nenhum} ${um} neste dia ainda. Use “Nova publicação” para criar uma já com esta data.`
                : `${nenhum} ${um} neste dia.`}
          </p>
        )}
      </section>
    </div>
  );
}
