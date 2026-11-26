import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { rotaInicial } from './rotas.js'

function RotaProtegida({ children, tiposPermitidos }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <p>Carregando...</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (tiposPermitidos && !tiposPermitidos.includes(user.tipo)) {
    // perfil sem permissão para esta página: volta para a Home do próprio perfil
    return <Navigate to={rotaInicial(user.tipo)} replace />
  }

  return children
}

export default RotaProtegida