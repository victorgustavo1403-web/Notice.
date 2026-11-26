// Sessão do usuário, guardada POR ABA (sessionStorage).
//
// Antes ficava em localStorage, que é compartilhado entre todas as abas e janelas do
// navegador: entrar com outra conta em uma segunda aba trocava o token da primeira, e as
// duas passavam a agir como um único usuário (ex.: um aluno marcava o aviso como lido
// e a leitura era gravada para a outra conta). Com sessionStorage cada aba tem a sua.
const CHAVE_TOKEN = "token";
const CHAVE_USUARIO = "usuario";

export const obterToken = () => sessionStorage.getItem(CHAVE_TOKEN);

export function obterUsuario() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_USUARIO));
  } catch {
    return null;
  }
}

export function salvarSessao(usuario, token) {
  sessionStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  sessionStorage.setItem(CHAVE_TOKEN, token);
  limparResiduoAntigo();
}

export function limparSessao() {
  sessionStorage.removeItem(CHAVE_USUARIO);
  sessionStorage.removeItem(CHAVE_TOKEN);
  limparResiduoAntigo();
}

// Remove a sessão que versões anteriores deixaram em localStorage (e que era compartilhada)
export function limparResiduoAntigo() {
  localStorage.removeItem(CHAVE_USUARIO);
  localStorage.removeItem(CHAVE_TOKEN);
}
