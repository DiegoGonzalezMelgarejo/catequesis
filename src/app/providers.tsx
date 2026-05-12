import { Toaster } from 'sonner'

import { AuthProvider } from '@/store/auth-context'
import { ActiveYearProvider } from '@/store/active-year-context'

type AppProvidersProps = {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <ActiveYearProvider>
        {children}
        <Toaster richColors position="top-center" />
      </ActiveYearProvider>
    </AuthProvider>
  )
}
