import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "./AuthContext.jsx";
import Dropdown from "./Dropdown.jsx";
import DatePicker from "./DatePicker.jsx";
import EditorTexto from "./EditorTexto.jsx";
import { hojeChave } from "./datas.js";
import { paraHtmlEditor, textoPuroDe } from "./conteudoRico.js";
import {
  bolinhaDaCategoria,
  corDaCategoria,
  letraDaCategoria,
  normalizarCategoria,
} from "./categoriaCores.js";
import "./styles/NovaPublicacaoModal.css";
import { obterToken } from "./sessao.js";

const API = "http://localhost:3001";

// Imagens padrão separadas por categoria. O nome do arquivo é a inicial da categoria
// + a posição: G1..G5 (Geral), E (Eventos), V (Vagas de Emprego), C (Coordenação),
// S (Secretaria). Tudo que estiver em src/assets/img/padroes/ com esse nome aparece sozinho.
const ARQUIVOS_PADRAO = import.meta.glob("./assets/img/padroes/[A-Z][0-9]*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const PADROES = Object.entries(ARQUIVOS_PADRAO)
  .map(([caminho, url]) => {
    const [, letra, n] = caminho.match(/\/([A-Z])(\d+)\.png$/) ?? [];
    return letra ? { chave: `${letra}${n}`, letra, n: Number(n), url } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.letra.localeCompare(b.letra) || a.n - b.n);
// Mesma ordem da navbar: Geral, Eventos, Vagas, Coordenação, Secretaria, Anexos
const ORDEM_CATEGORIAS = ["geral", "eventos", "vagas de emprego", "coordenacao", "secretaria", "anexos", "area do professor", "area dos funcionarios"];
const ordemCategoria = (nome) => {
  const i = ORDEM_CATEGORIAS.indexOf(normalizarCategoria(nome));
  return i === -1 ? ORDEM_CATEGORIAS.length : i;
};
const TAMANHO_MAX = 5 * 1024 * 1024; // mesmo limite do multer no backend (5 MB)

// Pop-up de criar / editar publicação (formulário à esquerda, editor da descrição à direita).
// publicacao = null  -> modo criação (dataInicial pré-preenche a data, ex.: vindo do calendário)
// publicacao = {...} -> modo edição (categoria não pode ser alterada)
export default function NovaPublicacaoModal({ publicacao, dataInicial = "", onClose, onSalvo }) {
  const { user, token: tokenContexto } = useAuth();
  const editando = Boolean(publicacao);

  const [categorias, setCategorias] = useState([]);
  const [titulo, setTitulo] = useState(publicacao?.titulo ?? "");
  // Descrição: HTML do editor. Publicações antigas (texto simples) são convertidas ao abrir.
  const [inicial] = useState(() =>
    paraHtmlEditor(publicacao?.conteudo ?? publicacao?.descricao ?? publicacao?.texto ?? ""),
  );
  const [descricao, setDescricao] = useState(inicial);
  const [descricaoTexto, setDescricaoTexto] = useState(() => textoPuroDe(inicial));
  const [categoriaId, setCategoriaId] = useState("");
  const [dataEvento, setDataEvento] = useState(publicacao?.data_evento ?? dataInicial ?? "");
  const [publico, setPublico] = useState(Boolean(publicacao?.publico));
  const [imagem, setImagem] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [padrao, setPadrao] = useState(null); // chave da imagem padrão escolhida
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [fechando, setFechando] = useState(false);

  const tituloRef = useRef(null);

  const categoriaSelecionada = categorias.find(
    (c) => String(c.id) === String(categoriaId),
  );
  const isAnexos = normalizarCategoria(categoriaSelecionada?.nome) === "anexos";

  // Sem nomes repetidos (ex.: "Vagas de Emprego" x "Vagas de emprego"): fica o de menor id
  const categoriasUnicas = categorias
    .filter(
      (c, i, todas) =>
        todas.findIndex(
          (o) =>
            normalizarCategoria(o.nome) === normalizarCategoria(c.nome) && o.id < c.id,
        ) === -1,
    )
    .sort((a, b) => ordemCategoria(a.nome) - ordemCategoria(b.nome));

  // "Anexos" é o calendário (reúne tudo que tem data): não se publica direto nela.
  // Só aparece (travada) ao editar uma publicação antiga que já estava em Anexos.
  const editandoAnexos = editando && normalizarCategoria(publicacao.categoria) === "anexos";
  const opcoesCategoria = categoriasUnicas
    .filter((c) => normalizarCategoria(c.nome) !== "anexos" || editandoAnexos)
    .map((c) => ({
    value: String(c.id),
    label: c.nome,
    cor: corDaCategoria(c.nome),
  }));

  // Imagens padrão da categoria escolhida
  const letraPadrao = letraDaCategoria(categoriaSelecionada?.nome);
  const padroesDaCategoria = letraPadrao
    ? PADROES.filter((p) => p.letra === letraPadrao)
    : [];

  // Imagem que a publicação já tem (só na edição)
  const imagemAtual = publicacao?.imagem_url
    ? publicacao.imagem_url.startsWith("http")
      ? publicacao.imagem_url
      : `${API}${publicacao.imagem_url}`
    : "";
  // "Divulgar ao público": precisa de data e de uma categoria aberta (não vale nas áreas restritas)
  const nomeDaCategoria = normalizarCategoria(categoriaSelecionada?.nome ?? publicacao?.categoria ?? "");
  const areaRestrita = ["area do professor", "area dos funcionarios"].includes(nomeDaCategoria);
  const podeDivulgar = Boolean(dataEvento) && Boolean(nomeDaCategoria) && !areaRestrita;
  const padraoEscolhido = padroesDaCategoria.find((p) => p.chave === padrao);
  const imagemExibida = previewUrl || padraoEscolhido?.url || imagemAtual;

  // Tem algo digitado? Aí o clique fora / Esc não descartam o formulário sem querer
  const sujo = Boolean(
    imagem ||
      padrao ||
      (!editando &&
        (titulo.trim() || descricaoTexto || categoriaId || dataEvento !== (dataInicial ?? ""))) ||
      (editando &&
        (titulo !== (publicacao.titulo ?? "") ||
          dataEvento !== (publicacao.data_evento ?? "") ||
          publico !== Boolean(publicacao.publico) ||
          descricao !== inicial)),
  );

  const fechar = () => {
    if (enviando || fechando) return;
    setFechando(true);
    setTimeout(onClose, 180); // espera a animação de saída
  };

  const fecharSeLimpo = () => {
    if (!sujo) fechar();
  };

  // Categorias
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const resposta = await fetch(`${API}/categorias`);
        if (!resposta.ok) throw new Error("Erro ao buscar categorias");
        const dados = await resposta.json();
        if (cancelado) return;
        setCategorias(dados);

        if (publicacao) {
          const cat = dados.find((c) => c.nome === publicacao.categoria);
          if (cat) setCategoriaId(String(cat.id));
        }
      } catch (err) {
        console.error("Erro ao buscar categorias:", err);
        if (!cancelado) setErro("Não foi possível carregar as categorias.");
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Libera a URL temporária da pré-visualização
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Trava o scroll da página e foca no título ao abrir
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    tituloRef.current?.focus();
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  // Esc fecha (se não houver nada digitado)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) fecharSeLimpo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const aplicarArquivo = (arquivo) => {
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setErro("O arquivo selecionado precisa ser uma imagem.");
      return;
    }
    if (arquivo.size > TAMANHO_MAX) {
      setErro("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setErro("");
    setPadrao(null);
    setImagem(arquivo);
    setPreviewUrl(URL.createObjectURL(arquivo));
  };

  const escolherPadrao = (chave) => {
    setErro("");
    setImagem(null);
    setPreviewUrl("");
    setPadrao((atual) => (atual === chave ? null : chave)); // clicar de novo desmarca
  };

  const removerImagemNova = () => {
    setImagem(null);
    setPreviewUrl("");
    setPadrao(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (!titulo.trim() || !descricaoTexto || (!editando && !categoriaId)) {
      setErro("Preencha todos os campos.");
      return;
    }

    const dataMudou = !editando || dataEvento !== (publicacao.data_evento ?? "");
    if (dataEvento && dataMudou && dataEvento < hojeChave()) {
      setErro("A data do evento não pode ser anterior a hoje.");
      return;
    }

    if (isAnexos && !dataEvento) {
      setErro("Esta publicação está em Anexos: mantenha uma data de evento.");
      return;
    }

    setEnviando(true);

    try {
      const formData = new FormData();
      formData.append("titulo", titulo.trim());
      formData.append("conteudo", descricao);
      formData.append("categoria_id", categoriaId);
      formData.append("autor_id", user?.id ?? "");
      // sempre enviado (vazio = sem data), assim dá para limpar a data ao editar
      formData.append("data_evento", dataEvento);
      // divulgação na agenda pública: só vale com data e fora das áreas restritas
      formData.append("publico", podeDivulgar && publico ? "1" : "0");

      if (imagem) {
        formData.append("imagem", imagem);
      } else if (padraoEscolhido) {
        // imagem padrão: vira um arquivo e segue o mesmo caminho do upload
        const blob = await (await fetch(padraoEscolhido.url)).blob();
        formData.append(
          "imagem",
          new File([blob], `padrao-${padraoEscolhido.chave}.png`, {
            type: blob.type?.startsWith("image/") ? blob.type : "image/png",
          }),
        );
      }

      const token = tokenContexto ?? obterToken();

      const resposta = await fetch(
        editando ? `${API}/publicacoes/${publicacao.id}` : `${API}/publicacoes`,
        {
          method: editando ? "PUT" : "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        const falha = new Error(`Status ${resposta.status}`);
        falha.mensagem = resposta.status === 400 ? corpo.erro : undefined;
        throw falha;
      }

      onSalvo?.({ dataEvento });
      setEnviando(false);
      setFechando(true);
      setTimeout(onClose, 180);
    } catch (err) {
      console.error("Erro ao publicar:", err);
      setErro(
        err.mensagem ||
          (editando
            ? "Não foi possível salvar as alterações. Tente novamente."
            : "Não foi possível publicar. Tente novamente."),
      );
      setEnviando(false);
    }
  };

  return createPortal(
    <div
      className={`pubform-overlay ${fechando ? "saindo" : ""}`}
      onClick={fecharSeLimpo}
      role="presentation"
    >
      <form
        className="pubform-janela"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pubform-titulo"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        {/* ===== Esquerda: dados da publicação ===== */}
        <section className="pubform-card pubform-painel-form">
          <img
            src={bolinhaDaCategoria(categoriaSelecionada?.nome)}
            alt=""
            className="bolinhas"
            style={{ position: "absolute", top: "20px", left: "20px" }}
          />
          <button
            type="button"
            className="pubform-fechar"
            onClick={fechar}
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>

        <header className="pubform-header">
          <h2 id="pubform-titulo">
            {editando ? "Editar publicação" : "Nova publicação"}
          </h2>
          <div className="pubform-sublinhado"></div>
        </header>

          <div className="pubform-corpo">
          <label className="pubform-campo">
            Título
            <input
              ref={tituloRef}
              className="pubform-input"
              type="text"
              placeholder="Digite o título da publicação"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              disabled={enviando}
            />
          </label>

          <div className="pubform-linha dupla">
            <div className="pubform-campo">
              <span id="pubform-rotulo-categoria">Categoria</span>
              <Dropdown
                ariaLabelledBy="pubform-rotulo-categoria"
                value={categoriaId}
                onChange={(v) => {
                  setCategoriaId(v);
                  setPadrao(null); // a imagem padrão escolhida pertencia a outra categoria
                }}
                options={opcoesCategoria}
                placeholder="Selecione uma categoria..."
                disabled={enviando || editando}
              />
            </div>

            <div className="pubform-campo">
              <span id="pubform-rotulo-data">
                {isAnexos ? "Data do evento" : "Data do evento (opcional)"}
              </span>
              <DatePicker
                ariaLabelledBy="pubform-rotulo-data"
                value={dataEvento}
                onChange={setDataEvento}
                min={hojeChave()}
                placeholder="Selecionar data"
                disabled={enviando}
              />
            </div>
          </div>

          <label
            className={`pubform-divulgar ${podeDivulgar ? "" : "desativado"}`}
            title={
              podeDivulgar
                ? undefined
                : areaRestrita
                  ? "Áreas restritas não podem ser divulgadas ao público."
                  : "Defina a data do evento para poder divulgar ao público."
            }
          >
            <input
              type="checkbox"
              checked={podeDivulgar && publico}
              disabled={!podeDivulgar || enviando}
              onChange={(e) => setPublico(e.target.checked)}
            />
            <span className="pubform-divulgar-caixa" aria-hidden="true" />
            <span className="pubform-divulgar-texto">
              <strong>Divulgar ao público</strong>
              <small>
                {areaRestrita
                  ? "Indisponível nas áreas restritas."
                  : "Mostra este evento na agenda da página inicial, para quem não tem login."}
              </small>
            </span>
          </label>

          <div className="pubform-campo">
            <span>{editando ? "Nova imagem (opcional)" : "Imagem"}</span>

            {imagemExibida ? (
              <div className="pubform-preview">
                <img src={imagemExibida} alt="Pré-visualização da imagem" />
                <div className="pubform-preview-acoes">
                  <label className="pubform-chip">
                    Trocar
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={enviando}
                      onChange={(e) => {
                        aplicarArquivo(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {(imagem || padrao) && (
                    <button
                      type="button"
                      className="pubform-chip"
                      onClick={removerImagemNova}
                      disabled={enviando}
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <label
                className={`pubform-drop ${arrastando ? "arrastando" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastando(true);
                }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setArrastando(false);
                  aplicarArquivo(e.dataTransfer.files?.[0]);
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                  <circle cx="9" cy="9" r="1.6" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <strong>Clique ou arraste uma imagem</strong>
                <small>PNG, JPG ou WEBP · até 5 MB</small>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={enviando}
                  onChange={(e) => {
                    aplicarArquivo(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            )}

            <div className="pubform-padroes">
              <span className="pubform-padroes-titulo">
                {categoriaSelecionada
                  ? `Ou escolha uma imagem padrão de ${categoriaSelecionada.nome}`
                  : "Ou escolha uma imagem padrão"}
              </span>

              {padroesDaCategoria.length > 0 ? (
                <div
                  className="pubform-padroes-grade"
                  role="group"
                  aria-label={`Imagens padrão de ${categoriaSelecionada.nome}`}
                >
                  {padroesDaCategoria.map((p) => (
                    <button
                      type="button"
                      key={p.chave}
                      className={`pubform-padrao ${padrao === p.chave ? "ativo" : ""}`}
                      aria-pressed={padrao === p.chave}
                      title={`${categoriaSelecionada.nome} ${p.n}`}
                      onClick={() => escolherPadrao(p.chave)}
                      disabled={enviando}
                    >
                      <img src={p.url} alt={`${categoriaSelecionada.nome} ${p.n}`} loading="lazy" />
                      {padrao === p.chave && (
                        <span className="pubform-padrao-check" aria-hidden="true">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="pubform-padroes-aviso">
                  {!categoriaSelecionada
                    ? "Selecione uma categoria para ver as imagens padrão."
                    : "Esta categoria não tem imagens padrão. Envie uma imagem acima."}
                </p>
              )}
            </div>
          </div>
          </div>
        </section>

        {/* ===== Direita: descrição com editor de texto ===== */}
        <section className="pubform-card pubform-painel-texto">
          <span id="pubform-rotulo-descricao" className="pubform-texto-rotulo">
            Descrição
          </span>

          <EditorTexto
            valorInicial={inicial}
            ariaLabelledBy="pubform-rotulo-descricao"
            disabled={enviando}
            onChange={(html, texto) => {
              setDescricao(html);
              setDescricaoTexto(texto);
            }}
          />

          {erro && (
            <p className="pubform-erro" role="alert">
              {erro}
            </p>
          )}

          <footer className="pubform-rodape">
            <button
              type="button"
              className="pubform-btn pubform-btn-cancelar"
              onClick={fechar}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="pubform-btn pubform-btn-publicar"
              disabled={enviando}
            >
              {enviando
                ? editando ? "Salvando..." : "Publicando..."
                : editando ? "Salvar alterações" : "Publicar"}
            </button>
          </footer>
        </section>
      </form>
    </div>,
    document.body,
  );
}
