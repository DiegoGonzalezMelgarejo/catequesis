import { useEffect } from 'react'

import { BootstrapOverlay } from '@/components/app/bootstrap-overlay'
import { Toaster } from 'sonner'

import { AuthProvider } from '@/store/auth-context'
import { ActiveYearProvider } from '@/store/active-year-context'
import { initializeBootstrapClient } from '@/store/bootstrap-store'

type AppProvidersProps = {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    initializeBootstrapClient()
  }, [])

  return (
    <AuthProvider>
      <ActiveYearProvider>
        {children}
        <BootstrapOverlay />
        <Toaster richColors position="top-center" />
      </ActiveYearProvider>
    </AuthProvider>
  )
}
