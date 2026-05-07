import { Navigate } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'

type PublicRouteProps = {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { loading, user } = useAuth()

  if (loading) {
    return null
  }

  if (user) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}
