import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import "./styles/cadastro-user.css";
import "./styles/painel-publicacoes.css";
import Dropdown from "./Dropdown.jsx";
import Dialogo, { ConfirmarDialogo } from "./ui/Dialogo.jsx";
import { useAvisos } from "./ui/Avisos.jsx";
import { useAuth } from "./AuthContext.jsx";
import { obterToken } from "./sessao.js";
import { normalizarCategoria } from "./categoriaCores.js";
import bolinhas from "./assets/img/bolinhas.png";
import { useRolagemSuave } from "./ui/useRolagemSuave.js";

const API = "http://localhost:3001";

// Tipos de conta: nome exibido, cor do selo e se aceita telefone
const TIPOS = {
  comum: { rotulo: "Aluno", plural: "Alunos", cor: "#0064af", telefone: true },
  professor: { rotulo: "Professor", plural: "Professores", cor: "#7b3fe4", telefone: true },
  coordenacao: { rotulo: "Coordenação", plural: "Coordenação", cor: "#77b502", telefone: true },
  administrador: { rotulo: "Administrador", plural: "Administradores", cor: "#8d8d92", telefone: false },
  super_admin: { rotulo: "Super admin", plural: "Super admin", cor: "#f54526", telefone: false },
};

const OPCOES_TIPO = [
  { value: "comum", label: "Aluno" },
  { value: "professor", label: "Professor" },
  { value: "coordenacao", label: "Coordenação (só visualiza)" },
  { value: "administrador", label: "Administrador (publicador)" },
];

const FILTROS = ["todos", "comum", "professor", "coordenacao", "administrador", "super_admin"];

const FORM_VAZIO = { rm: "", nome: "", email: "", senha: "", telefone: "", tipo: "comum" };

// (11) 91234-5678
function formatarTelefone(valor) {
  const digitos = String(valor ?? "").replace(/\D/g, "").slice(0, 11);
  if (!digitos) return "";
  if (digitos.length <= 2) return digitos.replace(/^(\d{0,2})/, "($1");
  if (digitos.length <= 7) return digitos.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  return digitos.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function iniciais(nome) {
  const partes = String(nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

// Validação dos campos do formulário, sempre em português. Devolve { campo: mensagem }.
function validar(form, editando) {
  const erros = {};
  if (!form.rm.trim()) erros.rm = "Informe o RM.";
  else if (!/^\d{5}$/.test(form.rm.trim())) erros.rm = "O RM deve ter exatamente 5 números.";
  if (!form.nome.trim()) erros.nome = "Informe o nome completo.";
  else if (form.nome.trim().length < 3) erros.nome = "O nome deve ter pelo menos 3 letras.";
  // e-mail é opcional: se vazio, o próprio usuário pode informar depois, no perfil
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
    erros.email = "Informe um e-mail válido, como nome@exemplo.com.";
  }
  if (!editando) {
    if (!form.senha) erros.senha = "Defina uma senha inicial.";
    else if (form.senha.length < 6) erros.senha = "A senha deve ter pelo menos 6 caracteres.";
  }
  if (TIPOS[form.tipo]?.telefone && form.telefone) {
    const n = form.telefone.replace(/\D/g, "").length;
    if (n < 10) erros.telefone = "Informe o telefone completo, com DDD.";
  }
  return erros;
}

function Campo({ id, rotulo, erro, ajuda, children }) {
  return (
    
    <div className={`campo ${erro ? "invalido" : ""}`}>
      <label htmlFor={id}>{rotulo}</label>
      {children}
      {erro ? (
        <p className="campo-erro" id={`${id}-erro`} role="alert">{erro}</p>
      ) : (
        ajuda && <p className="campo-ajuda">{ajuda}</p>
      )}
    </div>
  );
}

// Pop-up de criar / editar usuário
function UsuarioDialogo({ usuario, onClose, onSalvo }) {
  const editando = Boolean(usuario);
  const avisos = useAvisos();
  const [form, setForm] = useState(
    editando
      ? {
          ...FORM_VAZIO,
          nome: usuario.nome,
          email: usuario.email || "",
          telefone: formatarTelefone(usuario.telefone || ""),
          tipo: usuario.tipo,
          rm: usuario.rm,
        }
      : FORM_VAZIO,
  );
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const aceitaTelefone = TIPOS[form.tipo]?.telefone;

  const alterar = (campo, valor) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
    setErroGeral("");
  };

  async function enviar(e) {
    e.preventDefault();
    const encontrados = validar(form, editando);
    setErros(encontrados);
    const primeiro = Object.keys(encontrados)[0];
    if (primeiro) {
      document.getElementById(`usr-${primeiro}`)?.focus();
      return;
    }

    setSalvando(true);
    setErroGeral("");
    try {
      const resposta = await fetch(editando ? `${API}/usuarios/${usuario.id}` : `${API}/cadastro`, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${obterToken()}` },
        body: JSON.stringify({
          ...form,
          rm: form.rm.trim(),
          nome: form.nome.trim(),
          email: form.email.trim(),
          telefone: aceitaTelefone ? form.telefone : "",
        }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErroGeral(dados.erro || (editando ? "Não foi possível salvar as alterações." : "Não foi possível criar a conta."));
        return;
      }
      avisos.sucesso(
        editando
          ? `Dados de ${form.nome.trim()} atualizados.`
          : `Conta de ${form.nome.trim()} criada com sucesso.`,
      );
      onSalvo();
      onClose();
    } catch {
      setErroGeral("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialogo
      titulo={editando ? "Editar usuário" : "Novo usuário"}
      descricao={
        editando
          ? "Só o super admin altera RM e nome. O RM é o login do usuário."
          : "Preencha os dados. Se informar o e-mail, o usuário recebe uma mensagem de boas-vindas."
      }
      onClose={onClose}
      bloqueado={salvando}
      rodape={
        <>
          <button type="button" className="btn btn-secundario" onClick={onClose} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" form="form-usuario" className="btn btn-primario" disabled={salvando}>
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar conta"}
          </button>
        </>
      }
    >
      <form id="form-usuario" className="usr-form" onSubmit={enviar} noValidate>
        {erroGeral && <p className="dlg-erro" role="alert">{erroGeral}</p>}

        <div className="campo">
          <span className="campo-rotulo" id="usr-tipo-rotulo">Tipo de conta</span>
          <Dropdown
            id="usr-tipo"
            ariaLabelledBy="usr-tipo-rotulo"
            value={form.tipo}
            onChange={(tipo) => alterar("tipo", tipo)}
            options={OPCOES_TIPO}
            disabled={salvando}
          />
        </div>

        <Campo id="usr-rm" rotulo="RM" erro={erros.rm} ajuda={editando ? "Alterar o RM muda o login deste usuário." : "5 números, usado para entrar no sistema."}>
            <input
              id="usr-rm"
              className="campo-entrada"
              inputMode="numeric"
              maxLength={5}
              placeholder="ex: 12345"
              value={form.rm}
              onChange={(e) => alterar("rm", e.target.value.replace(/\D/g, ""))}
              aria-invalid={Boolean(erros.rm)}
              disabled={salvando}
            />
          </Campo>

        <Campo id="usr-nome" rotulo="Nome completo" erro={erros.nome}>
          <input
            id="usr-nome"
            className="campo-entrada"
            placeholder="Nome e sobrenome"
            value={form.nome}
            onChange={(e) => alterar("nome", e.target.value)}
            aria-invalid={Boolean(erros.nome)}
            disabled={salvando}
          />
        </Campo>

        <Campo id="usr-email" rotulo="E-mail (opcional)" erro={erros.email} ajuda="Usado para receber as notificações. O usuário também pode informar depois, no perfil.">
          <input
            id="usr-email"
            className="campo-entrada"
            type="text"
            inputMode="email"
            autoComplete="off"
            placeholder="nome@exemplo.com"
            value={form.email}
            onChange={(e) => alterar("email", e.target.value)}
            aria-invalid={Boolean(erros.email)}
            disabled={salvando}
          />
        </Campo>

        {aceitaTelefone && (
          <Campo id="usr-telefone" rotulo="Telefone (opcional)" erro={erros.telefone}>
            <input
              id="usr-telefone"
              className="campo-entrada"
              inputMode="tel"
              placeholder="(11) 91234-5678"
              value={form.telefone}
              onChange={(e) => alterar("telefone", formatarTelefone(e.target.value))}
              aria-invalid={Boolean(erros.telefone)}
              disabled={salvando}
            />
          </Campo>
        )}

        {!editando && (
          <Campo id="usr-senha" rotulo="Senha inicial" erro={erros.senha} ajuda="Mínimo de 6 caracteres.">
            <div className="usr-senha">
              <input
                id="usr-senha"
                className="campo-entrada"
                type={mostrarSenha ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.senha}
                onChange={(e) => alterar("senha", e.target.value)}
                aria-invalid={Boolean(erros.senha)}
                disabled={salvando}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Campo>
        )}
      </form>
    </Dialogo>
  );
}

export default function CadastroUsuario() {
  useRolagemSuave();
  const navigate = useNavigate();
  const { user } = useAuth();
  const avisos = useAvisos();

  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [dialogo, setDialogo] = useState(null); // { usuario } | "novo"
  const [paraApagar, setParaApagar] = useState(null);
  const [apagando, setApagando] = useState(false);
  const [erroApagar, setErroApagar] = useState("");

  const buscarUsuarios = useCallback(async () => {
    setCarregando(true);
    setFalhou(false);
    try {
      const resposta = await fetch(`${API}/usuarios`, {
        headers: { Authorization: `Bearer ${obterToken()}` },
      });
      if (!resposta.ok) throw new Error();
      setUsuarios(await resposta.json());
    } catch {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscarUsuarios();
  }, [buscarUsuarios]);

  const contagem = useMemo(() => {
    const c = { todos: usuarios.length, comum: 0, professor: 0, coordenacao: 0, administrador: 0, super_admin: 0 };
    for (const u of usuarios) c[u.tipo] = (c[u.tipo] ?? 0) + 1;
    return c;
  }, [usuarios]);

  const filtrados = useMemo(() => {
    const termo = normalizarCategoria(busca);
    return usuarios.filter((u) => {
      if (filtro !== "todos" && u.tipo !== filtro) return false;
      if (!termo) return true;
      return normalizarCategoria(`${u.nome} ${u.rm} ${u.email ?? ""}`).includes(termo);
    });
  }, [usuarios, busca, filtro]);

  async function confirmarApagar() {
    if (!paraApagar) return;
    setApagando(true);
    setErroApagar("");
    try {
      const resposta = await fetch(`${API}/usuarios/${paraApagar.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${obterToken()}` },
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErroApagar(dados.erro || "Não foi possível apagar a conta.");
        return;
      }
      avisos.sucesso(`A conta de ${paraApagar.nome} foi apagada.`);
      setParaApagar(null);
      buscarUsuarios();
    } catch {
      setErroApagar("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setApagando(false);
    }
  }

  return (
    <div className="usr-pagina">
      <div id="smooth-wrapper">
      <div id="smooth-content">
      <Link
        className="usr-voltar"
        to="#"
        onClick={(e) => {
          e.preventDefault();
          navigate(-1);
        }}
      >
        <ArrowLeft size={16} strokeWidth={2.6} aria-hidden="true" />
        <span>VOLTAR</span>
      </Link>

      <main className="usr-conteudo">
        <header className="usr-cabecalho">
          <div>
            <img src={bolinhas} alt="" className="usr-bolinhas" />
            <h1 className="usr-titulo">Usuários.</h1>
            <p className="usr-subtitulo">
              Crie, edite e remova as contas de alunos, professores, coordenação e administradores.
            </p>
          </div>
          <button type="button" className="btn btn-primario usr-novo" onClick={() => setDialogo("novo")}>
            <Plus size={16} strokeWidth={2.8} /> Novo usuário
          </button>
        </header>

        <section className="usr-painel" aria-label="Lista de usuários">
          <div className="usr-barra">
            <div className="usr-filtros" role="group" aria-label="Filtrar por tipo de conta">
              {FILTROS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`usr-filtro ${filtro === f ? "ativo" : ""}`}
                  aria-pressed={filtro === f}
                  onClick={() => setFiltro(f)}
                >
                  {f === "todos" ? "Todos" : TIPOS[f].plural}
                  <b>{contagem[f] ?? 0}</b>
                </button>
              ))}
            </div>

            <label className="painel-busca usr-busca">
              <Search size={16} strokeWidth={2} aria-hidden="true" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, RM ou e-mail"
                aria-label="Buscar usuários"
              />
              {busca && (
                <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca">
                  <X size={14} strokeWidth={2.2} />
                </button>
              )}
            </label>
          </div>

          {carregando ? (
            <p className="usr-estado" role="status">Carregando usuários...</p>
          ) : falhou ? (
            <div className="usr-estado" role="alert">
              <p>Não foi possível carregar os usuários.</p>
              <button type="button" className="btn btn-primario" onClick={buscarUsuarios}>
                Tentar novamente
              </button>
            </div>
          ) : filtrados.length === 0 ? (
            <p className="usr-estado">
              {usuarios.length === 0
                ? "Nenhum usuário cadastrado ainda."
                : "Nenhum usuário encontrado com esses filtros."}
            </p>
          ) : (
            <ul className="usr-lista">
              {filtrados.map((u) => {
                const tipo = TIPOS[u.tipo] ?? TIPOS.comum;
                const ehSuper = u.tipo === "super_admin";
                const ehEuMesmo = Number(u.id) === Number(user?.id);
                return (
                  <li key={u.id} className="usr-item">
                    <span className="usr-avatar" style={{ "--cor": tipo.cor }} aria-hidden="true">
                      {u.foto_url ? <img src={`${API}${u.foto_url}`} alt="" /> : iniciais(u.nome)}
                    </span>

                    <div className="usr-identidade">
                      <strong>{u.nome}</strong>
                      <span>{u.email || "Sem e-mail"}</span>
                    </div>

                    <span className="usr-rm" title="RM">RM {u.rm}</span>

                    <span className="usr-selo" style={{ "--cor": tipo.cor }}>
                      <i aria-hidden="true" />
                      {tipo.rotulo}
                    </span>

                    <span className="usr-telefone">
                      {tipo.telefone ? formatarTelefone(u.telefone) || "—" : "—"}
                    </span>

                    <div className="usr-acoes">
                      {!ehSuper && (
                        <button
                          type="button"
                          className="usr-icone"
                          onClick={() => setDialogo({ usuario: u })}
                          aria-label={`Editar ${u.nome}`}
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {!ehSuper && !ehEuMesmo && (
                        <button
                          type="button"
                          className="usr-icone perigo"
                          onClick={() => {
                            setErroApagar("");
                            setParaApagar(u);
                          }}
                          aria-label={`Apagar ${u.nome}`}
                          title="Apagar"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      </div>
      </div>

      {dialogo && (
        <UsuarioDialogo
          usuario={dialogo === "novo" ? null : dialogo.usuario}
          onClose={() => setDialogo(null)}
          onSalvo={buscarUsuarios}
        />
      )}

      {paraApagar && (
        <ConfirmarDialogo
          titulo="Apagar conta?"
          texto={
            <>
              A conta de <strong>{paraApagar.nome}</strong> (RM {paraApagar.rm}) será removida
              definitivamente. Essa ação não pode ser desfeita.
            </>
          }
          rotuloConfirmar="Apagar"
          rotuloCarregando="Apagando..."
          carregando={apagando}
          erro={erroApagar}
          onConfirmar={confirmarApagar}
          onCancelar={() => setParaApagar(null)}
        />
      )}
    </div>
  );
}
