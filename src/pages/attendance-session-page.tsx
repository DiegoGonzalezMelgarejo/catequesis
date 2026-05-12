import { Link, useSearchParams } from 'react-router-dom'

import { AppCard } from '@/components/app/app-card'
import { SecondaryButton } from '@/components/app/secondary-button'
import { AttendanceSessionForm } from '@/features/attendance/attendance-session-form'
import { useAuth } from '@/hooks/use-auth'
import { useBackNavigation } from '@/hooks/use-back-navigation'

export function AttendanceSessionPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('groupId')
  const { backLabel, backTo } = useBackNavigation(groupId ? `/app/attendance?groupId=${groupId}` : '/app/attendance', 'Volver al histórico')

  if (!user) {
    return null
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
        <SecondaryButton asChild>
          <Link to={backTo}>{backLabel}</Link>
        </SecondaryButton>
      </div>
      <AppCard title="Flujo sugerido" description="Completa la asistencia en este orden para hacerlo mas rapido y evitar errores.">
        <div className="grid gap-3 sm:grid-cols-3 text-sm text-muted-foreground">
          <div className="rounded-[0.95rem] bg-secondary/35 px-4 py-4">
            <p className="font-medium text-foreground">1. Grupo</p>
            <p className="mt-1">Confirma el grupo correcto antes de empezar.</p>
          </div>
          <div className="rounded-[0.95rem] bg-secondary/35 px-4 py-4">
            <p className="font-medium text-foreground">2. Fecha</p>
            <p className="mt-1">Verifica que corresponde al encuentro que vas a registrar.</p>
          </div>
          <div className="rounded-[0.95rem] bg-secondary/35 px-4 py-4">
            <p className="font-medium text-foreground">3. Guardar</p>
            <p className="mt-1">Marca estados, agrega observaciones si hace falta y guarda.</p>
          </div>
        </div>
      </AppCard>
      <AttendanceSessionForm
        user={user}
        initialGroupId={groupId}
        initialDate={searchParams.get('date')}
        mode={searchParams.get('mode') === 'edit' ? 'edit' : 'new'}
      />
    </div>
  )
}
