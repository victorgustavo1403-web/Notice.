import './styles/Auth.css'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { Cardauth } from './animations/auth.js';
import { gsap } from "gsap"
import arteTrombone from "./assets/img/padroes/trombone.jpg";
import bolAzul from "./assets/img/bolinhas-categorias/geral.png";
import Logo from "./ui/Logo.jsx";
import { useRolagemSuave } from "./ui/useRolagemSuave.js";
import { useGSAP } from "@gsap/react"
import { ArrowLeft, Bell, Check } from "lucide-react";
import { rotaInicial } from './rotas.js'
gsap.registerPlugin(useGSAP);

// Ícones simples em SVG, sem depender de nenhuma lib
function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.7 19.7 0 0 1 4.22-5.06M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a19.7 19.7 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}


const COR = { azul: "#0064af", vermelho: "#f54526", amarelo: "#edbe03", verde: "#77b502", laranja: "#fd8552" };
const SLOGAN = [
  { palavra: "Entre", cor: COR.azul },
  { palavra: "Leia", cor: COR.vermelho },
  { palavra: "Participe", cor: COR.verde },
];

function Auth() {
  useRolagemSuave();

  useGSAP(() => {
    Cardauth('.auth-card')
    // entrada no mesmo estilo das seções da home (quem pede menos movimento vê tudo parado)
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.auth-eyebrow-linha', { scaleX: 0, transformOrigin: 'left center', duration: 1.1, ease: 'power3.out' })
      gsap.timeline()
        .from('.auth-linha-texto', { yPercent: 115, rotate: 5, transformOrigin: 'left bottom', duration: 1.1, ease: 'expo.out', stagger: 0.12 })
      gsap.from('.auth-eyebrow-bolinha', { scale: 0, duration: 0.6, ease: 'back.out(2.6)', stagger: 0.08 })
      gsap.from('.auth-el', { y: 70, opacity: 0, scale: 0.92, duration: 1.1, ease: 'power3.out', stagger: 0.14, delay: 0.35, clearProps: 'transform,opacity' })
    })
    return () => mm.revert()
  }, []);

  const [view, setView] = useState('login') // 'login' | 'recuperar'
  const [error, setError] = useState('')
  const [campoErro, setCampoErro] = useState('') // campo com problema (borda vermelha + foco)
  const [recoverySent, setRecoverySent] = useState(false)
  const [loading, setLoading] = useState(false)

  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const isLogin = view === 'login'

  // Mostra o erro, marca o campo e leva o foco até ele (validação própria, sempre em português)
  const falhar = (form, campo, mensagem) => {
    setError(mensagem)
    setCampoErro(campo)
    form.elements[campo]?.focus()
  }

  const MSG_SERVIDOR = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCampoErro('')

    const rm = e.target.rm.value.trim()
    const senha = e.target.senha.value

    if (!rm) return falhar(e.target, 'rm', 'Informe seu RM.')
    if (!/^\d{5}$/.test(rm)) return falhar(e.target, 'rm', 'O RM deve conter exatamente 5 números.')
    if (!senha) return falhar(e.target, 'senha', 'Informe sua senha.')

    setLoading(true)

    try {
      const resposta = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rm, senha }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        setError(dados.erro || 'Erro no login.')
        return
      }

      login(dados.usuario, dados.token)

      // Redireciona conforme o tipo do usuário logado
      const tipo = dados.usuario.tipo
      navigate(rotaInicial(tipo))

    } catch (err) {
      console.error(err)
      setError(MSG_SERVIDOR)
    } finally {
      setLoading(false)
    }
  }

  const handleRecoverySubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCampoErro('')

    const rm = e.target.rm.value.trim()
    const novaSenha = e.target.novaSenha.value
    const confirmarSenha = e.target.confirmarSenha.value

    if (!rm) return falhar(e.target, 'rm', 'Informe seu RM.')
    if (!/^\d{5}$/.test(rm)) return falhar(e.target, 'rm', 'O RM deve conter exatamente 5 números.')
    if (!novaSenha) return falhar(e.target, 'novaSenha', 'Informe a nova senha.')
    if (novaSenha.length < 6) return falhar(e.target, 'novaSenha', 'A nova senha deve ter pelo menos 6 caracteres.')
    if (!confirmarSenha) return falhar(e.target, 'confirmarSenha', 'Confirme a nova senha.')
    if (novaSenha !== confirmarSenha) return falhar(e.target, 'confirmarSenha', 'As senhas não coincidem.')

    setLoading(true)

    try {
      const resposta = await fetch('http://localhost:3001/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rm, novaSenha }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        setError(dados.erro || 'Não foi possível redefinir a senha.')
        return
      }

      setRecoverySent(true)

    } catch (err) {
      console.error(err)
      setError(MSG_SERVIDOR)
    } finally {
      setLoading(false)
    }
  }

  const goToView = (nextView) => {
    setView(nextView)
    setError('')
    setCampoErro('')
    setRecoverySent(false)
  }

  return (
    <div className="auth-raiz">
      <div id="smooth-wrapper" className="auth-smooth">
        <div id="smooth-content" className="landing-content">
          <main className="auth-pagina">
            {/* luzes ambiente (como na seção Sobre) */}
            <i className="auth-brilho auth-brilho-1" aria-hidden="true" />
            <i className="auth-brilho auth-brilho-2" aria-hidden="true" />
            <i className="auth-brilho auth-brilho-3" aria-hidden="true" />

            <div className="auth-eyebrow" aria-hidden="true">
              <div className="auth-eyebrow-bolinhas">
                {Object.values(COR).map((cor) => (
                  <i key={cor} className="auth-eyebrow-bolinha" style={{ background: cor }} />
                ))}
              </div>
              <span className="auth-eyebrow-linha" />
              <span className="auth-eyebrow-rotulo">Acesso</span>
            </div>

            <div className="auth-grade">
              {/* vitrine: slogan + elementos de interface (some no celular) */}
              <section className="auth-vitrine" aria-hidden="true">
                <p className="auth-slogan">
                  {SLOGAN.map(({ palavra, cor }) => (
                    <span key={palavra} className="auth-linha">
                      <span className="auth-linha-texto">
                        {palavra}
                        <i className="auth-ponto" style={{ background: cor }} />
                      </span>
                    </span>
                  ))}
                </p>

                <div className="auth-colagem">
                  <div className="auth-el auth-mini" style={{ "--rot": "-6deg", "--atraso": "0s" }}>
                    <div className="auth-mini-arte"><img src={arteTrombone} alt="" /></div>
                    <div className="auth-mini-info">
                      <div className="auth-mini-meta"><img src={bolAzul} alt="" /><span>09/11/2026</span></div>
                      <div className="auth-mini-barras"><i /><i /></div>
                      <span className="auth-mini-btn">Ver publicação</span>
                    </div>
                  </div>

                  <div className="auth-el auth-toast" style={{ "--rot": "2deg", "--atraso": "-2s" }}>
                    <span className="auth-toast-icone"><Bell size={18} strokeWidth={2.4} /></span>
                    <span className="auth-toast-texto">
                      <strong>Novo aviso · Eventos</strong>
                      <small>Feira de profissões, sexta às 14h</small>
                    </span>
                    <i className="auth-toast-ponto" />
                  </div>

                  <div className="auth-el auth-data" style={{ "--rot": "5deg", "--atraso": "-4s" }}>
                    <small>NOV</small>
                    <strong>14</strong>
                    <span><i style={{ background: COR.vermelho }} /><i style={{ background: COR.amarelo }} /><i style={{ background: COR.verde }} /></span>
                  </div>

                  <div className="auth-el auth-lida" style={{ "--rot": "-3deg", "--atraso": "-1s" }}>
                    <Check size={16} strokeWidth={3} /> Marcado como lida
                  </div>
                </div>
              </section>

              <section className="auth-painel">
                <div className="auth-card">
                  <Link to="/" className="auth-logo" aria-label="Notice — voltar ao início">
                    <Logo />
                  </Link>

        {isLogin ? (

          <>
<h1 className="auth-title">Bem-vindo de volta.</h1>
            <p className="auth-subtitle">Entre com seus dados para acessar o sistema.</p>

            <form className="auth-form" onSubmit={handleLoginSubmit} noValidate>

              <div className="auth-field">
                <label htmlFor="rm">RM ou Nº de matrícula</label>
                <input
                  id="rm"
                  name="rm"
                  aria-invalid={campoErro === 'rm'}
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="ex: 12345"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="senha">Senha</label>
                <div className="auth-input-senha">
                  <input
                    id="senha"
                    name="senha"
                    aria-invalid={campoErro === 'senha'}
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="••••••••"
                    />
                  <button
                    type="button"
                    className="auth-toggle-senha"
                    onClick={() => setMostrarSenha(v => !v)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="auth-extra">
               
                <button type="button" className="auth-forgot" onClick={() => goToView('recuperar')}>
                  Esqueceu a senha?
                </button>
              </div>

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'ENTRANDO...' : 'ENTRAR'}
              </button>

            </form>
          </>

        ) : (

          <>
            <h1 className="auth-title">Recuperar senha.</h1>
            <p className="auth-subtitle">Informe seu RM e defina uma nova senha.</p>

            {recoverySent ? (

              <>
                <p className="auth-success">
                  Senha redefinida com sucesso! Já pode fazer login com a nova senha.
                </p>
                <button type="button" className="auth-submit" onClick={() => goToView('login')}>
                  VOLTAR PARA O LOGIN
                </button>
              </>

            ) : (

              <form className="auth-form" onSubmit={handleRecoverySubmit} noValidate>

                <div className="auth-field">
                  <label htmlFor="rm-recuperar">RM</label>
                  <input
                    id="rm-recuperar"
                    name="rm"
                    aria-invalid={campoErro === 'rm'}
                    type="text"
                    inputMode="numeric"
                      maxLength={5}
                    placeholder="Ex: 12345"
                    />
                </div>

                <div className="auth-field">
                  <label htmlFor="novaSenha">Nova senha</label>
                  <div className="auth-input-senha">
                    <input
                      id="novaSenha"
                      name="novaSenha"
                      aria-invalid={campoErro === 'novaSenha'}
                      type={mostrarNovaSenha ? 'text' : 'password'}
                      placeholder="••••••••"
                        />
                    <button
                      type="button"
                      className="auth-toggle-senha"
                      onClick={() => setMostrarNovaSenha(v => !v)}
                      aria-label={mostrarNovaSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {mostrarNovaSenha ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="confirmarSenha">Confirmar nova senha</label>
                  <div className="auth-input-senha">
                    <input
                      id="confirmarSenha"
                      name="confirmarSenha"
                      aria-invalid={campoErro === 'confirmarSenha'}
                      type={mostrarConfirmarSenha ? 'text' : 'password'}
                      placeholder="••••••••"
                        />
                    <button
                      type="button"
                      className="auth-toggle-senha"
                      onClick={() => setMostrarConfirmarSenha(v => !v)}
                      aria-label={mostrarConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {mostrarConfirmarSenha ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {error && <p className="auth-error" role="alert">{error}</p>}

                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? 'SALVANDO...' : 'REDEFINIR SENHA'}
                </button>

                <p className="auth-switch">
                  <button type="button" className="auth-switch-link" onClick={() => goToView('login')}>
                    Voltar para o login
                  </button>
                </p>

              </form>

            )}
          </>

        )}

                <Link to="/" className="auth-voltar-link">
                  <ArrowLeft size={15} strokeWidth={2.4} aria-hidden="true" />
                  Voltar ao início
                </Link>
                </div>
              </section>
            </div>

          </main>
        </div>
      </div>
    </div>
  )
}

export default Auth