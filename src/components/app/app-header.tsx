import { Bell, Download, LogOut, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/app/badge'
import { Modal } from '@/components/app/modal'
import { SecondaryButton } from '@/components/app/secondary-button'
import { YearManagementPanel } from '@/components/app/year-management-panel'
import { useActiveYear } from '@/hooks/use-active-year'
import { useAuth } from '@/hooks/use-auth'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import type { Role } from '@/types/models'
import { formatRoleLabel } from '@/utils/role'
import { formatYearLabel } from '@/utils/year'

type AppHeaderProps = {
  title: string
  description: string
  role: Role
}

export function AppHeader({ title, description, role }: AppHeaderProps) {
  const { logout } = useAuth()
  const { activeYear, availableYears, setActiveYear, createYearPeriod } = useActiveYear()
  const { canInstall, installApp, isIos, isMobileDevice } = useInstallPrompt()
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false
  const canCreateYearPeriod = role === 'ADMIN'

  async function handleInstall() {
    if (canInstall) {
      const installed = await installApp()
      if (installed) {
        toast.success('Aplicación lista para abrirse desde la pantalla principal.')
      }
      return
    }

    if (isIos) {
      setShowIosHelp(true)
      return
    }

    toast.message('La instalación estará disponible cuando el navegador lo permita.')
  }

  return (
    <>
      <header className="safe-top z-20 border-b border-white/70 bg-background/80 backdrop-blur sm:sticky sm:top-0">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-5 lg:px-0">
          <div className="rounded-[1.4rem] border border-white/80 bg-white/88 px-4 py-4 shadow-card backdrop-blur-xl sm:px-5 lg:px-6 lg:py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2.5">
                <div className="hidden flex-wrap items-center gap-2 sm:flex">
                  <Badge variant="default">{formatRoleLabel(role)}</Badge>
                  {activeYear ? <Badge variant="secondary">{formatYearLabel(activeYear)}</Badge> : null}
                  <Badge variant="outline">Offline first</Badge>
                  {isOffline ? (
                    <Badge variant="warning" className="gap-1">
                      <WifiOff className="size-3.5" />
                      Sin internet
                    </Badge>
                  ) : null}
                </div>
                <div>
                  <div className="flex items-center gap-2 sm:block">
                    <h1 className="text-[1.45rem] font-semibold tracking-tight sm:text-2xl lg:text-[2rem]">{title}</h1>
                    {isOffline ? (
                      <Badge variant="warning" className="sm:hidden">
                        Sin internet
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
                  {activeYear ? <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.14em] text-primary">Trabajando en {formatYearLabel(activeYear)}</p> : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto lg:justify-end">
                {activeYear ? (
                  <SecondaryButton className="hidden sm:inline-flex" onClick={() => setShowYearPicker(true)}>
                    {formatYearLabel(activeYear)}
                  </SecondaryButton>
                ) : null}
                {isMobileDevice ? (
                  <>
                    <SecondaryButton className="hidden sm:inline-flex" onClick={handleInstall} aria-label="Instalar aplicacion">
                      <Download className="size-4" />
                      Instalar
                    </SecondaryButton>
                    <SecondaryButton size="icon" className="sm:hidden" onClick={handleInstall} aria-label="Instalar aplicacion">
                      <Download className="size-4" />
                    </SecondaryButton>
                  </>
                ) : null}
                <SecondaryButton className="hidden sm:inline-flex" asChild>
                  <Link to="/app/alerts" aria-label="Ver alertas">
                    <Bell className="size-4" />
                    Alertas
                  </Link>
                </SecondaryButton>
                <SecondaryButton size="icon" className="sm:hidden" asChild>
                  <Link to="/app/alerts" aria-label="Ver alertas">
                    <Bell className="size-4" />
                  </Link>
                </SecondaryButton>
                <SecondaryButton className="hidden sm:inline-flex" onClick={logout} aria-label="Cerrar sesion">
                  <LogOut className="size-4" />
                  Salir
                </SecondaryButton>
                <SecondaryButton size="icon" className="sm:hidden" onClick={logout} aria-label="Cerrar sesion">
                  <LogOut className="size-4" />
                </SecondaryButton>
              </div>
            </div>
          </div>
        </div>
      </header>

      <Modal
        open={showYearPicker}
        onOpenChange={setShowYearPicker}
        title="Cambiar año de trabajo"
        description="Elige otro corte anual para cambiar el contexto visible de la aplicacion."
        footer={<SecondaryButton onClick={() => setShowYearPicker(false)}>Cerrar</SecondaryButton>}
      >
        <YearManagementPanel
          activeYear={activeYear}
          availableYears={availableYears}
          onSelectYear={setActiveYear}
          onCreateYear={createYearPeriod}
          onDone={() => setShowYearPicker(false)}
          canCreate={canCreateYearPeriod}
        />
      </Modal>

      <Modal
        open={showIosHelp}
        onOpenChange={setShowIosHelp}
        title="Instalar en iPhone"
        description="En Safari puedes agregar esta aplicación a la pantalla de inicio sin App Store."
        footer={<SecondaryButton onClick={() => setShowIosHelp(false)}>Entendido</SecondaryButton>}
      >
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li>1. Abre esta app en Safari.</li>
          <li>2. Toca el botón Compartir.</li>
          <li>3. Selecciona Agregar a pantalla de inicio.</li>
          <li>4. Confirma el nombre y toca Agregar.</li>
        </ol>
      </Modal>
    </>
  )
}
