import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileText, FileUp, Users, X } from "lucide-react";
import { obterUsuario } from "../sessao.js";
import { useAvisos } from "./Avisos.jsx";
import { ConfirmarDialogo } from "./Dialogo.jsx";
import {
  abrirCurriculo, curriculoAtual, enviarCurriculo, erroDoArquivo, formatarEnvio,
  formatarTamanho, lembrarCurriculo, retirarCurriculo, ehVaga,
} from "../curriculos.js";
import "../styles/candidatura.css";

/**
 * Bloco de candidatura dentro do pop-up de uma vaga de emprego.
 *  - aluno: envia, troca ou retira o currículo (PDF)
 *  - administrador / super admin: vê quantos currículos chegaram e vai para a lista
 *  - demais perfis e visitantes: nada aparece
 */
export default function Candidatura({ publicacao }) {
  const usuario = obterUsuario();
  if (!publicacao || !ehVaga(publicacao.categoria)) return null;
  if (usuario?.tipo === "comum") return <CandidaturaAluno publicacao={publicacao} />;
  if (["administrador", "super_admin"].includes(usuario?.tipo)) return <ResumoAdmin publicacao={publicacao} />;
  return null;
}

function ResumoAdmin({ publicacao }) {
  const total = publicacao.total_curriculos ?? 0;
  return (
    <section className="cand cand-admin" aria-label="Currículos recebidos">
      <span className="cand-icone" aria-hidden="true"><Users size={18} strokeWidth={2.2} /></span>
      <p className="cand-admin-texto">
        {total === 0 ? "Nenhum currículo recebido ainda." : <><strong>{total}</strong> {total === 1 ? "currículo recebido" : "currículos recebidos"}</>}
      </p>
      {total > 0 && (
        <Link to={`/curriculos?vaga=${publicacao.id}`} className="btn btn-secundario cand-admin-link">Ver currículos</Link>
      )}
    </section>
  );
}

function CandidaturaAluno({ publicacao }) {
  const avisos = useAvisos();
  const [atual, setAtual] = useState(() => curriculoAtual(publicacao));
  const [arquivo, setArquivo] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [confirmarRetirar, setConfirmarRetirar] = useState(false);
  const [retirando, setRetirando] = useState(false);
  const input = useRef(null);

  // ao trocar de vaga no mesmo pop-up, recomeça
  // (só pelo id: a lista por trás pode recriar o objeto sem que a vaga mude)
  const ultimaVaga = useRef(publicacao.id);
  useEffect(() => {
    if (ultimaVaga.current === publicacao.id) return;
    ultimaVaga.current = publicacao.id;
    setAtual(curriculoAtual(publicacao));
    setArquivo(null); setMensagem(""); setErro("");
  }, [publicacao]);

  const escolher = (lista) => {
    const f = lista?.[0];
    if (!f) return;
    const problema = erroDoArquivo(f);
    setErro(problema);
    setArquivo(problema ? null : f);
    // trocar o currículo já enviado: manda direto, sem passo extra
    if (!problema && atual) enviar(f);
  };

  const enviar = async (f = arquivo) => {
    const problema = erroDoArquivo(f);
    if (problema) { setErro(problema); return; }
    setEnviando(true); setErro("");
    try {
      const dados = await enviarCurriculo(publicacao.id, f, mensagem);
      lembrarCurriculo(publicacao.id, dados.curriculo);
      setAtual(dados.curriculo);
      setArquivo(null); setMensagem("");
      avisos?.sucesso(dados.mensagem);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  };

  const retirar = async () => {
    setRetirando(true);
    try {
      const dados = await retirarCurriculo(publicacao.id);
      lembrarCurriculo(publicacao.id, null);
      setAtual(null);
      setConfirmarRetirar(false);
      avisos?.sucesso(dados.mensagem);
    } catch (e) {
      setErro(e.message);
      setConfirmarRetirar(false);
    } finally {
      setRetirando(false);
    }
  };

  const ver = async () => {
    try { await abrirCurriculo(atual.id, atual.nome_original); } catch (e) { setErro(e.message); }
  };

  const seletor = (
    <input
      ref={input}
      type="file"
      accept="application/pdf,.pdf"
      className="cand-input"
      onChange={(e) => escolher(e.target.files)}
      tabIndex={-1}
      aria-hidden="true"
    />
  );

  if (atual) {
    return (
      <section className="cand cand-enviado" aria-label="Sua candidatura">
        {seletor}
        <div className="cand-status">
          <CheckCircle2 size={20} strokeWidth={2.4} aria-hidden="true" />
          <div>
            <strong>Currículo enviado</strong>
            <small>em {formatarEnvio(atual.enviado_em)}</small>
          </div>
        </div>
        <button type="button" className="cand-arquivo" onClick={ver} title="Abrir o currículo enviado">
          <FileText size={18} strokeWidth={2.2} aria-hidden="true" />
          <span>{atual.nome_original}</span>
          <small>{formatarTamanho(atual.tamanho)}</small>
        </button>
        {erro && <p className="cand-erro" role="alert">{erro}</p>}
        <div className="cand-acoes">
          <button type="button" className="btn btn-secundario" onClick={() => input.current?.click()} disabled={enviando}>
            {enviando ? "Enviando..." : "Trocar arquivo"}
          </button>
          <button type="button" className="cand-retirar" onClick={() => setConfirmarRetirar(true)} disabled={enviando}>
            Retirar candidatura
          </button>
        </div>
        {confirmarRetirar && (
          <ConfirmarDialogo
            titulo="Retirar candidatura?"
            texto="Seu currículo será apagado e a escola deixará de vê-lo nesta vaga. Você pode enviar de novo depois."
            rotuloConfirmar="Retirar"
            rotuloCarregando="Retirando..."
            carregando={retirando}
            onConfirmar={retirar}
            onCancelar={() => setConfirmarRetirar(false)}
          />
        )}
      </section>
    );
  }

  return (
    <section className="cand" aria-label="Candidatar-se a esta vaga">
      <span className="pubmodal-descricao-rotulo">Candidatar-se</span>
      <p className="cand-texto">Envie seu currículo em PDF (até 5 MB). A escola recebe e entra em contato.</p>

      {seletor}
      {arquivo ? (
        <div className="cand-arquivo cand-escolhido">
          <FileText size={18} strokeWidth={2.2} aria-hidden="true" />
          <span>{arquivo.name}</span>
          <small>{formatarTamanho(arquivo.size)}</small>
          <button type="button" className="cand-limpar" onClick={() => setArquivo(null)} aria-label="Remover arquivo escolhido" disabled={enviando}>
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`cand-soltar ${arrastando ? "arrastando" : ""}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastando(false); escolher(e.dataTransfer.files); }}
        >
          <FileUp size={22} strokeWidth={2.2} aria-hidden="true" />
          <strong>Escolher PDF</strong>
          <small>ou arraste o arquivo para cá</small>
        </button>
      )}

      <label className="cand-recado">
        <span>Recado <small>(opcional)</small></span>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value.slice(0, 500))}
          rows={3}
          maxLength={500}
          placeholder="Ex.: disponibilidade de horário, curso e módulo"
        />
      </label>

      {erro && <p className="cand-erro" role="alert">{erro}</p>}

      <button type="button" className="btn btn-primario cand-enviar" onClick={() => enviar()} disabled={!arquivo || enviando}>
        {enviando ? "Enviando..." : "Enviar currículo"}
      </button>
    </section>
  );
}
