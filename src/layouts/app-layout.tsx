import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { ActiveYearGate } from '@/components/app/active-year-gate'
import { Badge } from '@/components/app/badge'
import { DesktopSidebar } from '@/components/app/desktop-sidebar'
import { AppHeader } from '@/components/app/app-header'
import { MobileBottomNavigation } from '@/components/app/mobile-bottom-navigation'
import { PasswordChangeGate } from '@/components/app/password-change-gate'
import { useActiveYear } from '@/hooks/use-active-year'
import { useAuth } from '@/hooks/use-auth'
import { navigationByRole, pageMetadata } from '@/theme/navigation'
import { formatYearLabel } from '@/utils/year'

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activeYear, yearJustChanged } = useActiveYear()
  const [pageTransitionStage, setPageTransitionStage] = useState<'idle' | 'entering'>('idle')

  useEffect(() => {
    if (!activeYear || !yearJustChanged) {
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })

    if (location.pathname !== '/app/dashboard') {
      navigate('/app/dashboard', { replace: true })
    }
  }, [activeYear, location.pathname, navigate, yearJustChanged])

  useEffect(() => {
    setPageTransitionStage('entering')

    const timeoutId = window.setTimeout(() => {
      setPageTransitionStage('idle')
    }, 220)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [location.pathname, location.search])

  if (!user) {
    return null
  }

  const requiresWorkYear = user.role !== 'SUPER_ADMIN'

  const metadata =
    pageMetadata.find((page) => page.match.test(location.pathname)) ?? pageMetadata[0]

  return (
    <div className="min-h-svh bg-[linear-gradient(180deg,#f8faff_0%,#f4f7ff_32%,#eef2ff_100%)]">
      <PasswordChangeGate />
      {requiresWorkYear && !user.mustChangePassword ? <ActiveYearGate /> : null}
      <div className="mx-auto min-h-svh max-w-[1600px] lg:grid lg:grid-cols-[296px_minmax(0,1fr)] lg:gap-7 lg:px-5 lg:py-5 xl:px-6 xl:py-6">
        <DesktopSidebar role={user.role} />
        <div className="min-w-0">
          <AppHeader title={metadata.title} description={metadata.description} role={user.role} />
          <main className="mx-auto flex max-w-7xl flex-1 flex-col gap-5 px-4 py-4 pb-32 sm:gap-6 sm:px-5 sm:py-5 lg:max-w-none lg:px-0 lg:pb-8 lg:pt-6">
            {requiresWorkYear && activeYear != null && yearJustChanged ? (
              <div className="rounded-[1rem] border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-top-2 motion-safe:duration-300 lg:rounded-[1.25rem]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">Año actualizado</Badge>
                  <span>Ahora estas viendo y creando datos en {formatYearLabel(activeYear)}.</span>
                </div>
              </div>
            ) : null}
            <div className={pageTransitionStage === 'entering' ? 'page-enter' : 'page-idle'}>
              {!user.mustChangePassword && (!requiresWorkYear || activeYear != null) ? <Outlet /> : null}
            </div>
          </main>
        </div>
      </div>
      <MobileBottomNavigation items={navigationByRole[user.role]} />
    </div>
  )
}
