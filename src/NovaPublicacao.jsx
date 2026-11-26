import './styles/home.css'
import './styles/nova-publicação.css'
import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import seta from "./assets/img/icones/seta_b.svg"
import setaHover from "./assets/img/icones/seta-ce.svg"

function NovaPublicacao() {
  const { user, token: tokenContexto } = useAuth()
  const navigate = useNavigate()

  // Modo edição: a rota /editar-publicacao/:id envia a publicação em state
  const { id } = useParams()
  const { state } = useLocation()
  const pub = state?.pub
  const editando = Boolean(id)

  const [categorias, setCategorias] = useState([])
  const [titulo, setTitulo] = useState(pub?.titulo ?? '')
  const [conteudo, setConteudo] = useState(pub?.conteudo ?? pub?.descricao ?? pub?.texto ?? '')
  const [categoriaId, setCategoriaId] = useState('')
  const [dataEvento, setDataEvento] = useState(pub?.data_evento ?? '')
  const [imagem, setImagem] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const categoriaSelecionada = categorias.find((c) => String(c.id) === String(categoriaId))
  const isAnexos = categoriaSelecionada?.nome === 'Anexos'

  // Se abriu a edição sem os dados (ex: link direto), volta para a home
  useEffect(() => {
    if (editando && !pub) navigate('/home', { replace: true })
  }, [editando, pub, navigate])

  useEffect(() => {
    const buscarCategorias = async () => {
      try {
        const resposta = await fetch('http://localhost:3001/categorias')

        if (!resposta.ok) {
          throw new Error('Erro ao buscar categorias')
        }

        const dados = await resposta.json()
        setCategorias(dados)

        // Na edição, seleciona a categoria da publicação
        if (pub) {
          const cat = dados.find((c) => c.nome === pub.categoria)
          if (cat) setCategoriaId(String(cat.id))
        }
      } catch (err) {
        console.error('Erro ao buscar categorias:', err)
        setErro('Não foi possível carregar as categorias.')
      }
    }

    buscarCategorias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // Se o usuário trocar de categoria e sair de "Anexos", limpa a data escolhida
  // (na edição a categoria não muda, então não limpa)
  useEffect(() => {
    if (!isAnexos && !editando) setDataEvento('')
  }, [isAnexos, editando])

  const handleImagemChange = (e) => {
    const arquivo = e.target.files?.[0]

    if (!arquivo) {
      setImagem(null)
      setPreviewUrl('')
      return
    }

    if (!arquivo.type.startsWith('image/')) {
      setErro('O arquivo selecionado precisa ser uma imagem.')
      return
    }

    setErro('')
    setImagem(arquivo)
    setPreviewUrl(URL.createObjectURL(arquivo))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')

    if (!titulo.trim() || !conteudo.trim() || (!editando && !categoriaId)) {
      setErro('Preencha todos os campos.')
      return
    }

    if (isAnexos && !dataEvento) {
      setErro('Selecione a data do evento para publicar em Anexos.')
      return
    }

    setEnviando(true)

    try {
      const formData = new FormData()
      formData.append('titulo', titulo.trim())
      formData.append('conteudo', conteudo.trim())
      formData.append('categoria_id', categoriaId)
      formData.append('autor_id', user?.id ?? '')

      if (isAnexos && dataEvento) {
        formData.append('data_evento', dataEvento)
      }

      if (imagem) {
        formData.append('imagem', imagem)
      }

      const token = tokenContexto ?? localStorage.getItem('token')

      const resposta = await fetch(
        editando
          ? `http://localhost:3001/publicacoes/${id}`
          : 'http://localhost:3001/publicacoes',
        {
          method: editando ? 'PUT' : 'POST',
          headers: editando ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData
        }
      )

      if (!resposta.ok) {
        throw new Error('Erro ao salvar publicação')
      }

      navigate(editando ? -1 : '/home')
    } catch (err) {
      console.error('Erro ao publicar:', err)
      setErro(
        editando
          ? 'Não foi possível salvar as alterações. Tente novamente.'
          : 'Não foi possível publicar. Tente novamente.'
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="voltar-cad-usuario"
        onClick={() => navigate(-1)}
      >
        <img src={seta} alt="" />
        <img src={setaHover} alt="" className="setaHover" />
        <p>VOLTAR</p>
      </button>

      <main className="categoria-main">

        <div className="categoria-titulo-wrapper">
          <h1 className="categoria-titulo">
            {editando ? 'Editar publicação' : 'Nova publicação'}
          </h1>

          <div className="categoria-sublinhado"></div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="pub-form"
          encType="multipart/form-data"
        >

          <label>
            Título

            <input
              className="pub-input"
              type="text"
              placeholder="Digite o título da publicação"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              disabled={enviando}
            />
          </label>

          <label>
            Categoria

            <select
              className="pub-input"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              disabled={enviando || editando}
            >
              <option value="">
                Selecione uma categoria...
              </option>

              {categorias.map((cat) => (
                <option
                  key={cat.id}
                  value={cat.id}
                >
                  {cat.nome}
                </option>
              ))}
            </select>
          </label>

          {isAnexos && (
            <label>
              Data do evento

              <input
                className="pub-input"
                type="date"
                value={dataEvento}
                onChange={(e) => setDataEvento(e.target.value)}
                disabled={enviando}
              />
            </label>
          )}

          <label>
            {editando ? 'Nova imagem (opcional)' : 'Imagem'}

            <input
              className="pub-input"
              type="file"
              accept="image/*"
              onChange={handleImagemChange}
              disabled={enviando}
            />
          </label>

          {previewUrl && (
            <div className="pub-preview-wrapper">
              <img
                src={previewUrl}
                alt="Pré-visualização da imagem"
                className="pub-preview"
              />
            </div>
          )}

          <label>
            Conteúdo

            <textarea
              className="pub-input pub-textarea"
              rows={6}
              placeholder="Digite o conteúdo da publicação..."
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              disabled={enviando}
            />
          </label>

          {erro && (
            <p className="categoria-status">
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="pub-button"
            disabled={enviando}
          >
            {enviando
              ? (editando ? 'Salvando...' : 'Publicando...')
              : (editando ? 'Salvar alterações' : 'Publicar')}
          </button>

        </form>

      </main>
    </>
  )
}

export default NovaPublicacao