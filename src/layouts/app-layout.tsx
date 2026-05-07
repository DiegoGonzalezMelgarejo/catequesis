import { ClipboardCheck } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'

import { AppHeader } from '@/components/app/app-header'
import { FloatingActionButton } from '@/components/app/floating-action-button'
import { MobileBottomNavigation } from '@/components/app/mobile-bottom-navigation'
import { useAuth } from '@/hooks/use-auth'
import { navigationByRole, pageMetadata, quickFabByRole } from '@/theme/navigation'

export function AppLayout() {
  const location = useLocation()
  const { user } = useAuth()

  if (!user) {
    return null
  }

  const metadata =
    pageMetadata.find((page) => page.match.test(location.pathname)) ?? pageMetadata[0]
  const fab = quickFabByRole[user.role]

  return (
    <div className="min-h-svh">
      <AppHeader title={metadata.title} description={metadata.description} role={user.role} />
      <main className="mx-auto flex max-w-6xl flex-1 flex-col gap-5 px-3 py-4 pb-28 sm:px-5 sm:py-6 lg:px-6">
        <Outlet />
      </main>
      {!location.pathname.includes('/attendance') ? (
        <FloatingActionButton to={fab.to} label={fab.label} icon={ClipboardCheck} />
      ) : null}
      <MobileBottomNavigation items={navigationByRole[user.role]} />
    </div>
  )
}
