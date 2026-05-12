import { createContext, useEffect, useMemo, useState } from 'react'

import { ensureDatabaseAuthReady, ensureDatabaseInitialized } from '@/database/seed'
import { clearSession, loginUser, restoreSession, syncSessionUser, updateUserPassword } from '@/services/auth-service'
import type { User } from '@/types/models'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  refreshUser: () => Promise<void>
  changePassword: (nextPassword: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function bootstrap() {
      const restoredUser = await restoreSession()

      if (active) {
        setUser(restoredUser)
        setLoading(false)
      }

      void ensureDatabaseInitialized()
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (username, password) => {
        await ensureDatabaseAuthReady()
        void ensureDatabaseInitialized()
        const authenticatedUser = await loginUser(username, password)
        setUser(authenticatedUser)
        return Boolean(authenticatedUser)
      },
      logout: () => {
        clearSession()
        setUser(null)
      },
      refreshUser: async () => {
        if (!user) {
          return
        }

        const refreshedUser = await syncSessionUser(user.id)
        setUser(refreshedUser)
      },
      changePassword: async (nextPassword) => {
        if (!user) {
          throw new Error('No hay una sesión activa.')
        }

        const updatedUser = await updateUserPassword(user.id, nextPassword)
        setUser(updatedUser)
      },
    }),
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
