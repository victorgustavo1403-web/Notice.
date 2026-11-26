import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { corDaCategoria, bolinhaDaCategoria } from "./categoriaCores.js";
import { dataDoEvento, dataPublicacao } from "./datas.js";
import Logo from "./ui/Logo.jsx";
import { useTema } from "./ui/Tema.jsx";
import "./styles/tv.css";

// A TV pode estar em outro computador: usa o mesmo endereço do site, na porta do servidor.
// Em http://localhost:5173 vira http://localhost:3001; em http://192.168.0.50 vira http://192.168.0.50:3001.
const API = `${window.location.protocol}//${window.location.hostname}:3001`;
const ATUALIZAR_MS = 60_000; // busca avisos novos a cada minuto
const COR_PADRAO = "#6b6b66";

// Tempo por aviso: padrão 15 s; dá para mudar na URL (/tv?tempo=20), entre 5 e 120 s
function lerTempo(parametro) {
  const n = parseInt(parametro, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 5), 120) : 15;
}

const fmtDiaMes = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
const fmtSemana = (d) => d.toLocaleDateString("pt-BR", { weekday: "long" });

// Etiqueta de cada aviso: evento futuro, novidade ou data de publicação
function etiqueta(aviso) {
  const evento = dataDoEvento(aviso.data_evento);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  if (evento && evento >= hoje) {
    const dias = Math.round((evento - hoje) / 86_400_000);
    const quando = dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : `${fmtSemana(evento)}, ${fmtDiaMes(evento)}`;
    return { texto: quando, tipo: "evento" };
  }
  const pub = dataPublicacao(aviso);
  if (pub && Date.now() - pub.getTime() < 48 * 3_600_000) return { texto: "Novo", tipo: "novo" };
  return { texto: pub ? `Publicado em ${pub.toLocaleDateString("pt-BR")}` : "", tipo: "recente" };
}

function Relogio() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="tv-relogio" aria-label="Data e hora">
      <strong>{agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong>
      <span>{agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
    </div>
  );
}

export default function TV() {
  const [params] = useSearchParams();
  const { definir } = useTema();
  const tempo = lerTempo(params.get("tempo"));
  const temaPedido = params.get("tema");
  const [avisos, setAvisos] = useState(null); // null = ainda carregando
  const [falha, setFalha] = useState(null);   // mensagem quando o servidor não responde
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [cursorOculto, setCursorOculto] = useState(false);
  const [imagemFalhou, setImagemFalhou] = useState({});
  const timerCursor = useRef(null);

  // A TV abre sempre no tema claro; /tv?tema=escuro para o escuro.
  // Não grava a escolha: ver o mural no computador não muda o tema do resto do site.
  useEffect(() => {
    definir(temaPedido === "escuro" ? "escuro" : "claro", false);
  }, [definir, temaPedido]);

  // a TV tem a sua própria aparência: esconde o botão de tema e o rolar da página
  useEffect(() => {
    document.body.classList.add("tv-ativa");
    document.title = "Notice. · Mural";
    return () => { document.body.classList.remove("tv-ativa", "tv-mouse"); document.title = "Notice."; };
  }, []);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`${API}/tv/avisos`, { cache: "no-store" });
      if (!r.ok) throw new Error(`O servidor respondeu ${r.status}`);
      const dados = await r.json();
      setAvisos([...dados.eventos, ...dados.recentes]);
      setFalha(null);
    } catch (erro) {
      // mantém na tela os avisos que já tinham sido carregados
      setFalha(erro?.message || "Sem conexão com o servidor");
      setAvisos((atual) => atual ?? []);
    }
  }, []);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, ATUALIZAR_MS);
    return () => clearInterval(id);
  }, [carregar]);

  // recarrega a página inteira de madrugada (limpa memória; pega versões novas do sistema)
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      if (d.getHours() === 4 && d.getMinutes() === 0) window.location.reload();
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // impede a TV/computador de apagar a tela
  useEffect(() => {
    let trava = null;
    const pedir = async () => { try { trava = await navigator.wakeLock?.request("screen"); } catch { /* sem suporte */ } };
    pedir();
    const aoVoltar = () => document.visibilityState === "visible" && pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { document.removeEventListener("visibilitychange", aoVoltar); trava?.release?.().catch(() => {}); };
  }, []);

  const total = avisos?.length ?? 0;
  const avancar = useCallback((d = 1) => setIndice((i) => (total ? (i + d + total) % total : 0)), [total]);

  // troca automática; reinicia a contagem ao trocar de aviso
  useEffect(() => {
    if (!total || pausado) return undefined;
    const id = setTimeout(() => avancar(1), tempo * 1000);
    return () => clearTimeout(id);
  }, [indice, total, tempo, pausado, avancar]);

  // se a lista encolher, não fica apontando para um aviso que não existe
  useEffect(() => { if (total && indice >= total) setIndice(0); }, [total, indice]);

  // teclado: ← → trocam, espaço pausa, F tela cheia
  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === "ArrowRight") avancar(1);
      else if (e.key === "ArrowLeft") avancar(-1);
      else if (e.key === " ") { e.preventDefault(); setPausado((p) => !p); }
      else if (e.key.toLowerCase() === "f") alternarTelaCheia();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [avancar]);

  // esconde o cursor e o botão de tema depois de alguns segundos sem mexer no mouse
  useEffect(() => {
    const mostrar = () => {
      setCursorOculto(false);
      document.body.classList.add("tv-mouse");
      clearTimeout(timerCursor.current);
      timerCursor.current = setTimeout(() => {
        setCursorOculto(true);
        document.body.classList.remove("tv-mouse");
      }, 3000);
    };
    mostrar();
    window.addEventListener("mousemove", mostrar);
    return () => { window.removeEventListener("mousemove", mostrar); clearTimeout(timerCursor.current); };
  }, []);

  const aviso = total ? avisos[indice] : null;
  const cor = aviso ? corDaCategoria(aviso.categoria) ?? COR_PADRAO : COR_PADRAO;
  const imagem = aviso && !imagemFalhou[aviso.id] ? urlImagemTv(aviso) : null;
  const tag = useMemo(() => (aviso ? etiqueta(aviso) : null), [aviso]);

  return (
    <div className={`tv-raiz ${cursorOculto ? "tv-sem-cursor" : ""}`} onDoubleClick={alternarTelaCheia}>
      <header className="tv-topo">
        <Logo className="tv-logo" />
        <span className="tv-escola">ETEC Campo Limpo Paulista · Mural de avisos</span>
        <Relogio />
      </header>

      <main className="tv-palco" aria-live="polite">
        {avisos === null && <p className="tv-vazio">Carregando avisos…</p>}

        {avisos && !aviso && falha && (
          <div className="tv-vazio">
            <h1>Servidor fora do ar</h1>
            <p>Não foi possível falar com <code>{API}</code>. Verifique se o servidor do Notice está ligado.</p>
            <p>{falha}</p>
          </div>
        )}

        {avisos && !aviso && !falha && (
          <div className="tv-vazio">
            <img src={bolinhaDaCategoria(null)} alt="" />
            <h1>Nenhum aviso no momento</h1>
            <p>Novos avisos aparecem aqui automaticamente.</p>
          </div>
        )}

        {aviso && (
          <article key={aviso.id} className="tv-slide" style={{ "--cor": cor }}>
            <div className="tv-midia">
              {imagem ? (
                <img src={imagem} alt="" onError={() => setImagemFalhou((f) => ({ ...f, [aviso.id]: true }))} />
              ) : (
                <div className="tv-midia-padrao"><img src={bolinhaDaCategoria(aviso.categoria)} alt="" /></div>
              )}
            </div>

            <div className="tv-texto">
              <div className="tv-metas">
                <span className="tv-categoria"><i />{aviso.categoria}</span>
                {tag?.texto && <span className={`tv-tag tv-tag-${tag.tipo}`}>{tag.texto}</span>}
              </div>
              <h1 className="tv-titulo">{aviso.titulo}</h1>
              {aviso.resumo && <p className="tv-resumo">{aviso.resumo}</p>}
            </div>
          </article>
        )}
      </main>

      <footer className="tv-base">
        <div className="tv-pontos" role="presentation">
          {avisos?.map((a, i) => (
            <span key={a.id} className={`tv-ponto ${i === indice ? "ativo" : ""} ${i < indice ? "feito" : ""}`}>
              {i === indice && <b key={`${a.id}-${indice}-${pausado}`} style={{ animationDuration: `${tempo}s`, animationPlayState: pausado ? "paused" : "running" }} />}
            </span>
          ))}
        </div>
        <span className="tv-contador">{total ? `${indice + 1} / ${total}` : ""}</span>
        {pausado && <span className="tv-estado">Pausado</span>}
        {total > 0 && falha && <span className="tv-estado tv-offline">Sem conexão · exibindo os últimos avisos</span>}
      </footer>
    </div>
  );
}

// Imagem da publicação no endereço do servidor que a TV está usando
function urlImagemTv(aviso) {
  const img = aviso.imagem_url;
  if (!img) return null;
  return img.startsWith("http") ? img : `${API}${img}`;
}

function alternarTelaCheia() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
