import { BookHeart, CalendarRange, GraduationCap, ShieldAlert, UserRound, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { EntityAvatar } from '@/components/app/entity-avatar'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { SecondaryButton } from '@/components/app/secondary-button'
import { SummaryCard } from '@/components/app/summary-card'
import { useAsyncData } from '@/hooks/use-async-data'
import { useAuth } from '@/hooks/use-auth'
import { getStudentHistory } from '@/services/student-service'
import { formatDate } from '@/utils/date'

const attendanceBadgeVariant = {
  PRESENTE: 'success',
  AUSENTE: 'destructive',
  JUSTIFICADO: 'warning',
} as const

export function StudentHistoryPage() {
  const { user } = useAuth()
  const { studentId } = useParams()
  const { data: history, loading } = useAsyncData(
    () => (user && studentId ? getStudentHistory(user, studentId) : Promise.resolve(null)),
    [user?.id, studentId],
  )

  if (!user || !studentId) {
    return null
  }

  if (loading) {
    return <PageSkeleton variant="detail" />
  }

  if (!history) {
    return (
      <EmptyState
        title="Alumno no disponible"
        description="No encontramos el alumno o no tienes permisos para verlo."
        icon={GraduationCap}
        action={
          <SecondaryButton asChild>
            <Link to="/app/students">Volver a alumnos</Link>
          </SecondaryButton>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <SecondaryButton asChild>
        <Link to="/app/students">Volver a alumnos</Link>
      </SecondaryButton>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Grupo" value={history.student.groupName} icon={GraduationCap} />
        <SummaryCard title="Presentes" value={history.attendanceSummary.presentes} icon={CalendarRange} />
        <SummaryCard title="Ausentes" value={history.attendanceSummary.ausentes} icon={ShieldAlert} />
        <SummaryCard title="Sacramentos" value={history.sacraments.length} icon={BookHeart} />
      </div>

      <AppCard>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <EntityAvatar icon={UserRound} label={history.student.fullName} className="size-20" />
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">{history.student.fullName}</h2>
                <Badge variant="secondary">{history.student.groupName}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{history.student.age} años • Ficha pastoral del alumno</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                <p className="text-muted-foreground">Acudientes</p>
                <p className="mt-1 font-medium text-foreground">{history.student.guardianCount}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                <p className="text-muted-foreground">Sacramentos</p>
                <p className="mt-1 font-medium text-foreground">{history.sacraments.length}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                <p className="text-muted-foreground">Grupo</p>
                <p className="mt-1 font-medium text-foreground">{history.student.groupName}</p>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Observaciones</p>
              <p className="mt-2">{history.student.observations || 'Sin observaciones'}</p>
              <p className="mt-3 text-xs">Sacramentos: {history.sacraments.join(', ') || 'Sin registrar'}</p>
            </div>
          </div>
        </div>
      </AppCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <AppCard title="Acudientes" description="Contactos principales del alumno.">
          <div className="space-y-3">
            {history.guardians.length === 0 ? (
              <EmptyState title="Sin acudientes" description="Este alumno no tiene acudientes registrados." icon={Users} />
            ) : (
              history.guardians.map((guardian) => (
                <div key={guardian.id} className="rounded-[1.5rem] border border-white/70 bg-secondary/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{guardian.name}</p>
                    {guardian.isPrimary ? <Badge variant="success">Principal</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{guardian.relationship}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{guardian.phone || guardian.whatsapp || guardian.email || 'Sin contacto'}</p>
                </div>
              ))
            )}
          </div>
        </AppCard>

        <AppCard title="Asistencia" description="Historial de participacion del alumno.">
          <div className="space-y-3">
            {history.attendance.length === 0 ? (
              <EmptyState title="Sin asistencias" description="Aún no hay registros de asistencia." icon={CalendarRange} />
            ) : (
              history.attendance.map((entry, index) => (
                <div key={`${entry.date}-${index}`} className="rounded-[1.5rem] border border-white/70 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{formatDate(entry.date)}</p>
                    <Badge variant={attendanceBadgeVariant[entry.status]}>
                      {entry.status}
                    </Badge>
                  </div>
                  {entry.observations ? <p className="mt-2 text-sm text-muted-foreground">{entry.observations}</p> : null}
                </div>
              ))
            )}
          </div>
        </AppCard>
      </div>

      <AppCard title="Actividades y notas" description="Seguimiento de evaluaciones, tareas y participacion.">
        <div className="space-y-3">
          {history.activities.length === 0 ? (
            <EmptyState title="Sin actividades" description="No hay actividades registradas para este grupo." icon={GraduationCap} />
          ) : (
            history.activities.map((activity) => (
              <div key={activity.id} className="rounded-[1.5rem] border border-white/70 bg-secondary/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(activity.date)} • {activity.type}</p>
                  </div>
                  <Badge variant="secondary">
                    {activity.grade != null ? `${activity.grade}/${activity.maxGrade}` : `Pendiente/${activity.maxGrade}`}
                  </Badge>
                </div>
                {activity.observations ? <p className="mt-2 text-sm text-muted-foreground">{activity.observations}</p> : null}
              </div>
            ))
          )}
        </div>
      </AppCard>
    </div>
  )
}
