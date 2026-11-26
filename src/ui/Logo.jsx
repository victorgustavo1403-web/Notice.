import logoCompleta from "../assets/img/logo-completa.png";
import logoCompletaClara from "../assets/img/logo-completa-clara.png";
import logoN from "../assets/img/logo.png";
import logoNClara from "../assets/img/logo-clara.png";

// Logo do Notice nas duas cores; o CSS mostra a versão do tema ativo.
//   variante "completa": "Notice." por extenso · "n": só o "N."
export default function Logo({ variante = "completa", className = "", alt = "Notice" }) {
  const [escura, clara] = variante === "n" ? [logoN, logoNClara] : [logoCompleta, logoCompletaClara];
  return (
    <span className={`logo-tema ${className}`}>
      <img className="logo-tema-claro" src={escura} alt={alt} />
      <img className="logo-tema-escuro" src={clara} alt={alt} />
    </span>
  );
}
