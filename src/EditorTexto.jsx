import { useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, Link2, List,
  ListOrdered, Redo2, RemoveFormatting, Strikethrough, Underline, Undo2, Unlink,
} from "lucide-react";
import "./styles/Prosa.css";
import "./styles/EditorTexto.css";

// Botão da barra (não rouba o foco do texto)
function Botao({ titulo, ativo = false, bloqueado = false, onClick, children }) {
  return (
    <button
      type="button"
      className={`editor-btn ${ativo ? "ativo" : ""}`}
      title={titulo}
      aria-label={titulo}
      aria-pressed={ativo}
      disabled={bloqueado}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// Editor de texto das descrições. De propósito NÃO tem fonte, tamanho nem cor:
// só formatação simples, para não quebrar o layout dos cards e do pop-up.
export default function EditorTexto({
  valorInicial = "",
  onChange,
  disabled = false,
  limite = 5000,
  placeholder = "Escreva a descrição da publicação...",
  ariaLabelledBy,
}) {
  const [linkAberto, setLinkAberto] = useState(false);
  const [url, setUrl] = useState("");
  const [erroLink, setErroLink] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["mailto"],
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      TextAlign.configure({ types: ["paragraph"] }),
      Placeholder.configure({ placeholder }),
      CharacterCount.configure({ limit: limite }),
    ],
    content: valorInicial,
    editable: !disabled,
    onUpdate: ({ editor: ed }) =>
      onChange?.(ed.isEmpty ? "" : ed.getHTML(), ed.getText().trim()),
    editorProps: {
      attributes: {
        class: "prosa editor-prosa",
        role: "textbox",
        "aria-multiline": "true",
        ...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {}),
      },
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const estado = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      !ed
        ? null
        : {
            negrito: ed.isActive("bold"),
            italico: ed.isActive("italic"),
            sublinhado: ed.isActive("underline"),
            tachado: ed.isActive("strike"),
            marcadores: ed.isActive("bulletList"),
            numerada: ed.isActive("orderedList"),
            link: ed.isActive("link"),
            alinhamento:
              ["center", "right", "justify"].find((a) => ed.isActive({ textAlign: a })) ?? "left",
            podeDesfazer: ed.can().undo(),
            podeRefazer: ed.can().redo(),
            caracteres: ed.storage.characterCount.characters(),
          },
  });

  if (!editor || !estado) return null;

  const cmd = () => editor.chain().focus();

  const abrirLink = () => {
    if (linkAberto) {
      setLinkAberto(false);
      return;
    }
    setUrl(editor.getAttributes("link").href ?? "");
    setErroLink("");
    setLinkAberto(true);
  };

  const aplicarLink = () => {
    let destino = url.trim();
    if (!destino) {
      cmd().extendMarkRange("link").unsetLink().run();
      setLinkAberto(false);
      return;
    }
    if (!/^(https?:\/\/|mailto:)/i.test(destino)) destino = `https://${destino}`;
    try {
      const u = new URL(destino);
      if (!["http:", "https:", "mailto:"].includes(u.protocol)) throw new Error();
    } catch {
      setErroLink("Endereço inválido.");
      return;
    }
    cmd().extendMarkRange("link").setLink({ href: destino }).run();
    setLinkAberto(false);
  };

  const removerLink = () => {
    cmd().extendMarkRange("link").unsetLink().run();
    setLinkAberto(false);
  };

  const alinhar = (a) => cmd().setTextAlign(a).run();
  const ICONE = 17;

  return (
    <div className={`editor ${disabled ? "desabilitado" : ""}`}>
      <div className="editor-barra" role="toolbar" aria-label="Formatação do texto">
        <div className="editor-grupo">
          <Botao bloqueado={disabled} titulo="Negrito (Ctrl+B)" ativo={estado.negrito} onClick={() => cmd().toggleBold().run()}><Bold size={ICONE} /></Botao>
          <Botao bloqueado={disabled} titulo="Itálico (Ctrl+I)" ativo={estado.italico} onClick={() => cmd().toggleItalic().run()}><Italic size={ICONE} /></Botao>
          <Botao bloqueado={disabled} titulo="Sublinhado (Ctrl+U)" ativo={estado.sublinhado} onClick={() => cmd().toggleUnderline().run()}><Underline size={ICONE} /></Botao>
          <Botao bloqueado={disabled} titulo="Tachado" ativo={estado.tachado} onClick={() => cmd().toggleStrike().run()}><Strikethrough size={ICONE} /></Botao>
        </div>
        <span className="editor-sep" aria-hidden="true" />
        <div className="editor-grupo">
          <Botao bloqueado={disabled} titulo="Lista com marcadores" ativo={estado.marcadores} onClick={() => cmd().toggleBulletList().run()}><List size={ICONE} /></Botao>
          <Botao bloqueado={disabled} titulo="Lista numerada" ativo={estado.numerada} onClick={() => cmd().toggleOrderedList().run()}><ListOrdered size={ICONE} /></Botao>
        </div>
        <span className="editor-sep" aria-hidden="true" />
        <div className="editor-grupo">
          <Botao bloqueado={disabled} titulo="Alinhar à esquerda" ativo={estado.alinhamento === "left"} onClick={() => alinhar("left")}><AlignLeft size={ICONE} /></Botao>
          <Botao bloqueado={disabled} titulo="Centralizar" ativo={estado.alinhamento === "center"} onClick={() => alinhar("center")}><AlignCenter size={ICONE} /></Botao>
          <Botao bloqueado={disabled} titulo="Alinhar à direita" ativo={estado.alinhamento === "right"} onClick={() => alinhar("right")}><AlignRight size={ICONE} /></Botao>
          <Botao bloqueado={disabled} titulo="Justificar" ativo={estado.alinhamento === "justify"} onClick={() => alinhar("justify")}><AlignJustify size={ICONE} /></Botao>
        </div>
        <span className="editor-sep" aria-hidden="true" />
        <div className="editor-grupo">
          <Botao bloqueado={disabled} titulo="Inserir link" ativo={estado.link || linkAberto} onClick={abrirLink}><Link2 size={ICONE} /></Botao>
          <Botao bloqueado={disabled} titulo="Limpar formatação" onClick={() => cmd().unsetAllMarks().clearNodes().unsetTextAlign().run()}><RemoveFormatting size={ICONE} /></Botao>
        </div>
        <span className="editor-sep editor-sep-fim" aria-hidden="true" />
        <div className="editor-grupo">
          <Botao titulo="Desfazer (Ctrl+Z)" bloqueado={disabled || !estado.podeDesfazer} onClick={() => cmd().undo().run()}><Undo2 size={ICONE} /></Botao>
          <Botao titulo="Refazer (Ctrl+Y)" bloqueado={disabled || !estado.podeRefazer} onClick={() => cmd().redo().run()}><Redo2 size={ICONE} /></Botao>
        </div>
      </div>

      {linkAberto && (
        <div
          className="editor-link"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault(); // fecha só o campo do link, não o pop-up
              e.stopPropagation();
              setLinkAberto(false);
              editor.commands.focus();
            } else if (e.key === "Enter") {
              e.preventDefault();
              aplicarLink();
            }
          }}
        >
          <input
            autoFocus
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setErroLink(""); }}
            placeholder="https://endereco-do-link.com"
            aria-label="Endereço do link"
            aria-invalid={Boolean(erroLink)}
          />
          <button type="button" className="editor-link-ok" onClick={aplicarLink}>Aplicar</button>
          {estado.link && (
            <button type="button" className="editor-link-remover" onClick={removerLink} title="Remover link" aria-label="Remover link">
              <Unlink size={15} />
            </button>
          )}
          {erroLink && <span className="editor-link-erro" role="alert">{erroLink}</span>}
        </div>
      )}

      <div className="editor-area" onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>

      <div className={`editor-contador ${estado.caracteres >= limite ? "no-limite" : ""}`} aria-live="polite">
        {estado.caracteres.toLocaleString("pt-BR")} / {limite.toLocaleString("pt-BR")}
      </div>
    </div>
  );
}
