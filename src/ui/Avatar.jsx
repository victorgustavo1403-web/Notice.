import "../styles/ui-avatar.css";

const API = "http://localhost:3001";

export const COR_POR_TIPO = {
  comum: "#0064af",
  professor: "#7b3fe4",
  coordenacao: "#77b502",
  administrador: "#8d8d92",
  super_admin: "#f54526",
};

export function iniciais(nome) {
  const partes = String(nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

// Foto de perfil redonda; sem foto, mostra as iniciais na cor do tipo de conta.
export default function Avatar({ usuario, tamanho = 40, className = "" }) {
  const cor = COR_POR_TIPO[usuario?.tipo] ?? COR_POR_TIPO.comum;
  return (
    <span
      className={`avatar ${className}`}
      style={{ "--cor": cor, "--tam": `${tamanho}px` }}
      aria-hidden="true"
    >
      {usuario?.foto_url ? (
        <img src={`${API}${usuario.foto_url}`} alt="" draggable="false" />
      ) : (
        <b>{iniciais(usuario?.nome)}</b>
      )}
    </span>
  );
}
