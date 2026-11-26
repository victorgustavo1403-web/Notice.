// Home de cada perfil. Um único login; depois de entrar, cada perfil cai na sua página.
export const HOME_POR_TIPO = {
  super_admin: "/home",
  administrador: "/home-admin",
  professor: "/home-comum", // mesma Home do aluno; a diferença é a Área do professor no menu
  coordenacao: "/home-comum", // só visualiza, mas também acessa a Área dos funcionários
  comum: "/home-comum",
};

export function rotaInicial(tipo) {
  return HOME_POR_TIPO[tipo] ?? "/home-comum";
}
