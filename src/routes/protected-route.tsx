import { Navigate } from 'react-router-dom'

import { LoadingState } from '@/components/app/loading-state'
import { useAuth } from '@/hooks/use-auth'

type ProtectedRouteProps = {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { loading, user } = useAuth()

  if (loading) {
    return <LoadingState fullScreen label="Preparando la experiencia offline" />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}
