import { useRef, useState } from "react";
import { Camera, Lock, Mail, Trash2 } from "lucide-react";
import NavBar from "./Nav-bar.jsx";
import Avatar, { COR_POR_TIPO } from "./ui/Avatar.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useAvisos } from "./ui/Avisos.jsx";
import { ConfirmarDialogo } from "./ui/Dialogo.jsx";
import { obterToken } from "./sessao.js";
import bolinhas from "./assets/img/bolinhas.png";
import "./styles/perfil.css";
import { useRolagemSuave } from "./ui/useRolagemSuave.js";

const API = "http://localhost:3001";
const MSG_SERVIDOR = "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ROTULO_TIPO = {
  comum: "Aluno",
  professor: "Professor",
  coordenacao: "Coordenação",
  administrador: "Administrador",
  super_admin: "Super admin",
};

// Recorta a foto em quadrado (centro) e reduz para até 512 px: envia menos dados e
// a foto sempre fica redonda e nítida, qualquer que seja a imagem escolhida.
async function prepararFoto(arquivo) {
  const bitmap = await createImageBitmap(arquivo);
  const lado = Math.min(bitmap.width, bitmap.height);
  const alvo = Math.min(512, lado);
  const canvas = document.createElement("canvas");
  canvas.width = alvo;
  canvas.height = alvo;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, alvo, alvo);
  ctx.drawImage(bitmap, (bitmap.width - lado) / 2, (bitmap.height - lado) / 2, lado, lado, 0, 0, alvo, alvo);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("falha"))), "image/jpeg", 0.88),
  );
}

export default function Perfil() {
  useRolagemSuave();
  const { user, atualizarUsuario } = useAuth();
  const avisos = useAvisos();
  const inputFoto = useRef(null);

  const [email, setEmail] = useState(user?.email ?? "");
  const [erroEmail, setErroEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [confirmarRemover, setConfirmarRemover] = useState(false);

  const recebeNotificacao = user?.tipo !== "super_admin";
  const emailSalvo = user?.email ?? "";
  const mudou = email.trim() !== emailSalvo;
  const cor = COR_POR_TIPO[user?.tipo] ?? COR_POR_TIPO.comum;

  async function salvarEmail(e) {
    e.preventDefault();
    const valor = email.trim();
    if (valor && !EMAIL_VALIDO.test(valor)) {
      setErroEmail("Informe um e-mail válido, como nome@exemplo.com.");
      document.getElementById("perfil-email")?.focus();
      return;
    }
    setErroEmail("");
    setSalvando(true);
    try {
      const resposta = await fetch(`${API}/perfil`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${obterToken()}` },
        body: JSON.stringify({ email: valor }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErroEmail(dados.erro || "Não foi possível salvar o e-mail.");
        return;
      }
      atualizarUsuario(dados.usuario);
      setEmail(dados.usuario.email ?? "");
      avisos.sucesso(dados.mensagem);
    } catch {
      setErroEmail(MSG_SERVIDOR);
    } finally {
      setSalvando(false);
    }
  }

  async function escolherFoto(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) {
      avisos.erro("Escolha uma imagem JPG, PNG ou WebP.");
      return;
    }
    setEnviandoFoto(true);
    try {
      const blob = await prepararFoto(arquivo);
      const form = new FormData();
      form.append("foto", blob, "perfil.jpg");
      const resposta = await fetch(`${API}/perfil/foto`, {
        method: "POST",
        headers: { Authorization: `Bearer ${obterToken()}` },
        body: form,
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        avisos.erro(dados.erro || "Não foi possível enviar a foto.");
        return;
      }
      atualizarUsuario(dados.usuario);
      avisos.sucesso("Foto de perfil atualizada.");
    } catch {
      avisos.erro("Não foi possível usar essa imagem. Tente outra foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function removerFoto() {
    try {
      const resposta = await fetch(`${API}/perfil/foto`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${obterToken()}` },
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        avisos.erro(dados.erro || "Não foi possível remover a foto.");
      } else {
        atualizarUsuario(dados.usuario);
        avisos.sucesso("Foto removida.");
      }
    } catch {
      avisos.erro(MSG_SERVIDOR);
    } finally {
      setConfirmarRemover(false);
    }
  }

  return (
    <div className="perfil-pagina">
      <NavBar />
      <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="liquid-glass" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.01 0.025" numOctaves="20" seed="15" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2.5" result="softNoise" />
            <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="100" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div id="smooth-wrapper">
      <div id="smooth-content">
      <main className="perfil-conteudo">
        <header className="perfil-cabecalho">
          <img src={bolinhas} alt="" className="perfil-bolinhas" />
          <h1 className="perfil-titulo">Meu perfil.</h1>
          <p className="perfil-subtitulo">Sua foto, seus dados de acesso e o e-mail que recebe as notificações.</p>
        </header>

        <div className="perfil-grade">
          {/* ---- identidade + foto ---- */}
          <section className="perfil-cartao perfil-identidade" aria-label="Foto de perfil">
            <div className="perfil-foto">
              <Avatar usuario={user} tamanho={150} className="perfil-avatar" />
              <button
                type="button"
                className="perfil-foto-botao"
                onClick={() => inputFoto.current?.click()}
                disabled={enviandoFoto}
                aria-label="Alterar foto de perfil"
                title="Alterar foto"
              >
                <Camera size={18} strokeWidth={2.4} />
              </button>
              {enviandoFoto && <span className="perfil-foto-carregando" role="status">Enviando...</span>}
            </div>
            <input
              ref={inputFoto}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="perfil-input-arquivo"
              onChange={escolherFoto}
              tabIndex={-1}
            />

            <h2 className="perfil-nome">{user?.nome}</h2>
            <span className="perfil-selo" style={{ "--cor": cor }}>
              <i aria-hidden="true" />
              {ROTULO_TIPO[user?.tipo] ?? "Usuário"}
            </span>

            <div className="perfil-foto-acoes">
              <button type="button" className="btn btn-primario" onClick={() => inputFoto.current?.click()} disabled={enviandoFoto}>
                {user?.foto_url ? "Trocar foto" : "Adicionar foto"}
              </button>
              {user?.foto_url && (
                <button type="button" className="btn btn-secundario" onClick={() => setConfirmarRemover(true)} disabled={enviandoFoto}>
                  <Trash2 size={15} strokeWidth={2.4} aria-hidden="true" /> Remover
                </button>
              )}
            </div>
            <p className="perfil-dica">JPG, PNG ou WebP. A foto é recortada em quadrado e fica redonda no sistema.</p>
          </section>

          <div className="perfil-coluna">
            {/* ---- dados da conta (somente leitura) ---- */}
            <section className="perfil-cartao" aria-labelledby="perfil-dados">
              <h2 className="perfil-secao" id="perfil-dados">Dados da conta</h2>
              <div className="perfil-linha-dupla">
                <div className="campo">
                  <label className="campo-rotulo" htmlFor="perfil-rm">RM</label>
                  <div className="perfil-bloqueado">
                    <input id="perfil-rm" className="campo-entrada" value={user?.rm ?? ""} readOnly />
                    <Lock size={15} aria-hidden="true" />
                  </div>
                </div>
                <div className="campo">
                  <label className="campo-rotulo" htmlFor="perfil-nome">Nome</label>
                  <div className="perfil-bloqueado">
                    <input id="perfil-nome" className="campo-entrada" value={user?.nome ?? ""} readOnly />
                    <Lock size={15} aria-hidden="true" />
                  </div>
                </div>
              </div>
              <p className="perfil-aviso">
                <Lock size={14} aria-hidden="true" />
                Por segurança, só o super admin pode alterar o RM e o nome. Precisa corrigir algo? Fale com a coordenação.
              </p>
            </section>

            {/* ---- e-mail para notificações ---- */}
            {recebeNotificacao ? (
              <section className="perfil-cartao" aria-labelledby="perfil-notif">
                <h2 className="perfil-secao" id="perfil-notif">Notificações por e-mail</h2>
                <form onSubmit={salvarEmail} noValidate>
                  <div className={`campo ${erroEmail ? "invalido" : ""}`}>
                    <label className="campo-rotulo" htmlFor="perfil-email">E-mail</label>
                    <div className="perfil-email">
                      <Mail size={17} aria-hidden="true" />
                      <input
                        id="perfil-email"
                        className="campo-entrada"
                        type="text"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="nome@exemplo.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (erroEmail) setErroEmail("");
                        }}
                        aria-invalid={Boolean(erroEmail)}
                        aria-describedby="perfil-email-ajuda"
                        disabled={salvando}
                      />
                    </div>
                    {erroEmail ? (
                      <p className="campo-erro" id="perfil-email-ajuda" role="alert">{erroEmail}</p>
                    ) : (
                      <p className="campo-ajuda" id="perfil-email-ajuda">
                        {emailSalvo
                          ? "Enviamos os avisos de novas publicações para este e-mail."
                          : "Você ainda não informou um e-mail e por isso não recebe avisos por e-mail. Os avisos continuam aparecendo no sino."}
                      </p>
                    )}
                  </div>
                  <div className="perfil-acoes">
                    <button type="submit" className="btn btn-primario" disabled={salvando || !mudou}>
                      {salvando ? "Salvando..." : "Salvar e-mail"}
                    </button>
                    {emailSalvo && !mudou && <span className="perfil-ok">E-mail cadastrado</span>}
                  </div>
                </form>
              </section>
            ) : (
              <section className="perfil-cartao" aria-labelledby="perfil-notif">
                <h2 className="perfil-secao" id="perfil-notif">Notificações por e-mail</h2>
                <p className="perfil-aviso perfil-aviso-solto">O super admin não recebe notificações por e-mail.</p>
              </section>
            )}
          </div>
        </div>
      </main>
      </div>
      </div>

      {confirmarRemover && (
        <ConfirmarDialogo
          titulo="Remover foto de perfil?"
          texto="Sua foto será apagada e voltaremos a mostrar as suas iniciais."
          rotuloConfirmar="Remover"
          onConfirmar={removerFoto}
          onCancelar={() => setConfirmarRemover(false)}
        />
      )}
    </div>
  );
}
