import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './Spinner'

const ProtectedRoute = ({ roles, children }) => {
  const { isAuthenticated, role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />

  if (roles && !roles.includes(role)) return <Navigate to="/" replace />

  return children
}

export default ProtectedRoute
