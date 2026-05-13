import { useEffect, useState } from 'react'

import { LoadingState } from '@/components/app/loading-state'
import { useBootstrapStore } from '@/store/bootstrap-store'

const stageCopy = {
  session: {
    title: 'Validando acceso',
    description: 'Estamos comprobando tu sesión y preparando el acceso seguro.',
    details: [
      'Revisando la sesión guardada en este dispositivo.',
      'Verificando permisos y datos básicos de tu cuenta.',
      'Preparando la conexión inicial de la aplicación.',
    ],
  },
  periods: {
    title: 'Cargando periodos',
    description: 'Estamos cargando el año de trabajo y los datos base de tu parroquia.',
    details: [
      'Buscando los periodos de trabajo disponibles.',
      'Restaurando el último año usado en este dispositivo.',
      'Sincronizando datos base para abrir el panel.',
    ],
  },
  panel: {
    title: 'Abriendo panel',
    description: 'Estamos organizando tu espacio de trabajo para que la app quede lista.',
    details: [
      'Armando tu panel principal.',
      'Cargando los primeros datos visibles.',
      'Dejando lista la experiencia inicial de la app.',
    ],
  },
} as const

const stageOrder = ['session', 'periods', 'panel'] as const

export function BootstrapOverlay() {
  const isPwaMobile = useBootstrapStore((state) => state.isPwaMobile)
  const isFirstPwaBoot = useBootstrapStore((state) => state.isFirstPwaBoot)
  const stage = useBootstrapStore((state) => state.stage)
  const startedAt = useBootstrapStore((state) => state.startedAt)
  const stageChangedAt = useBootstrapStore((state) => state.stageChangedAt)
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!stageChangedAt) {
      setElapsedMs(0)
      return
    }

    setElapsedMs(Date.now() - stageChangedAt)

    const intervalId = window.setInterval(() => {
      setElapsedMs(Date.now() - stageChangedAt)
    }, 500)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [stageChangedAt])

  if (!isPwaMobile || !stage) {
    return null
  }

  const copy = stageCopy[stage]
  const stageIndex = stageOrder.indexOf(stage) + 1
  const totalElapsedMs = startedAt ? Date.now() - startedAt : elapsedMs
  const showSlowHint = elapsedMs >= 3500
  const networkMessage = !isOnline
    ? 'Sin internet. Estamos usando los datos locales del dispositivo.'
    : stage === 'session'
      ? 'Conectando con el servidor y validando tus credenciales.'
      : stage === 'periods'
        ? 'Sincronizando periodos y datos base para dejar la app lista.'
        : 'Cargando el panel y acomodando la información inicial.'

  return (
    <div className="fixed inset-0 z-[80] bg-[linear-gradient(180deg,#f8faff_0%,#eef2ff_100%)]">
      <div className="flex min-h-svh items-center justify-center px-6 py-8">
        <div className="w-full max-w-md text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Paso {stageIndex} de {stageOrder.length}</p>
          <LoadingState label={copy.title} details={copy.details} fullScreen={false} />
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">{copy.description}</p>
            <p className="text-xs font-medium text-primary">{networkMessage}</p>
            {showSlowHint ? <p className="text-xs text-muted-foreground">La app ya puede seguir con carga progresiva. Estamos dejando el trabajo pesado en segundo plano.</p> : null}
            {import.meta.env.DEV ? <p className="text-[11px] text-muted-foreground/80">Bootstrap: {Math.round(totalElapsedMs / 100) / 10}s</p> : null}
          </div>
          {isFirstPwaBoot ? (
            <div className="mt-4 rounded-[1rem] border border-primary/15 bg-white/80 px-4 py-3 text-sm text-muted-foreground shadow-card backdrop-blur">
              <p className="font-medium text-foreground">Primera configuración en este celular</p>
              <p className="mt-1">La primera vez puede tardar un poco más mientras se prepara el almacenamiento local de la app.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
