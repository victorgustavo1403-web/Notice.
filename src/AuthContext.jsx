import { createContext, useContext, useState, useEffect } from 'react'
import { obterToken, obterUsuario, salvarSessao, limparSessao, limparResiduoAntigo } from './sessao.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Ao carregar a página, restaura a sessão DESTA aba (sessionStorage)
  useEffect(() => {
    limparResiduoAntigo() // sessão compartilhada de versões antigas: descarta
    const usuarioSalvo = obterUsuario()

    if (usuarioSalvo && obterToken()) {
      setUser(usuarioSalvo)
    }

    setLoading(false)
  }, [])

  const login = (userData, token) => {
    setUser(userData)
    salvarSessao(userData, token)
  }

  // Atualiza os dados do usuário logado (ex.: foto ou e-mail alterados no perfil)
  const atualizarUsuario = (dados) => {
    setUser((atual) => {
      const novo = { ...atual, ...dados }
      salvarSessao(novo, obterToken())
      return novo
    })
  }

  const logout = () => {
    setUser(null)
    limparSessao()
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, atualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}