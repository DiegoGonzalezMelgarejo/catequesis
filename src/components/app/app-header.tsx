import { Bell, Download, LogOut, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/app/badge'
import { Modal } from '@/components/app/modal'
import { SecondaryButton } from '@/components/app/secondary-button'
import { useAuth } from '@/hooks/use-auth'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import type { Role } from '@/types/models'

type AppHeaderProps = {
  title: string
  description: string
  role: Role
}

export function AppHeader({ title, description, role }: AppHeaderProps) {
  const { logout, user } = useAuth()
  const { canInstall, installApp, isIos } = useInstallPrompt()
  const [showIosHelp, setShowIosHelp] = useState(false)
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false

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
      <header className="safe-top sticky top-0 z-20 border-b border-white/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">{role === 'ADMIN' ? 'ADMIN' : 'CATEQUISTA'}</Badge>
              <Badge variant="outline">Offline first</Badge>
              {isOffline ? (
                <Badge variant="warning" className="gap-1">
                  <WifiOff className="size-3.5" />
                  Sin internet
                </Badge>
              ) : null}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
            <SecondaryButton size="icon" onClick={handleInstall} aria-label="Instalar aplicacion">
              <Download className="size-4" />
            </SecondaryButton>
            <SecondaryButton size="icon" asChild>
              <Link to="/app/alerts" aria-label="Ver alertas">
                <Bell className="size-4" />
              </Link>
            </SecondaryButton>
            <SecondaryButton size="icon" onClick={logout} aria-label="Cerrar sesion">
              <LogOut className="size-4" />
            </SecondaryButton>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-4 text-sm text-muted-foreground sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <span>{user?.fullName}</span>
          <span>{new Date().toLocaleDateString('es-CO', { dateStyle: 'full' })}</span>
        </div>
      </header>

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
