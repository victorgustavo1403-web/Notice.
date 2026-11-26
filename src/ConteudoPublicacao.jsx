import { ehHtml, sanitizarParaExibir } from "./conteudoRico.js";
import "./styles/Prosa.css";

// Mostra a descrição de uma publicação: HTML formatado (limpo) ou texto simples antigo
export default function ConteudoPublicacao({ conteudo, className = "" }) {
  if (!conteudo) return null;

  if (ehHtml(conteudo)) {
    return (
      <div
        className={`prosa ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizarParaExibir(conteudo) }}
      />
    );
  }

  return <div className={`prosa prosa-simples ${className}`}>{conteudo}</div>;
}
