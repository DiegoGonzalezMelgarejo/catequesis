import { BookUser, GraduationCap, Mail, Phone, UserRound, Users } from 'lucide-react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { EntityAvatar } from '@/components/app/entity-avatar'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { SecondaryButton } from '@/components/app/secondary-button'
import { SummaryCard } from '@/components/app/summary-card'
import { useAsyncData } from '@/hooks/use-async-data'
import { useAuth } from '@/hooks/use-auth'
import { useBackNavigation } from '@/hooks/use-back-navigation'
import { getCatechistDetail } from '@/services/user-service'

export function CatechistDetailPage() {
  const { user } = useAuth()
  const { catechistId } = useParams()
  const location = useLocation()
  const { backLabel, backTo } = useBackNavigation('/app/catechists', 'Volver a catequistas')
  const { data: detail, loading } = useAsyncData(
    () => (catechistId ? getCatechistDetail(catechistId) : Promise.resolve(null)),
    [catechistId],
  )

  if (!user) {
    return null
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/app/dashboard" replace />
  }

  if (loading) {
    return <PageSkeleton variant="detail" />
  }

  if (!detail) {
    return (
      <EmptyState
        title="Catequista no disponible"
        description="No encontramos el catequista solicitado."
        icon={Users}
        action={
          <SecondaryButton asChild>
            <Link to={backTo}>{backLabel}</Link>
          </SecondaryButton>
        }
      />
    )
  }

  const originState = { from: location.pathname + location.search, label: 'Volver al catequista' }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
        <SecondaryButton asChild>
          <Link to={backTo}>{backLabel}</Link>
        </SecondaryButton>
      </div>

      <AppCard>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <EntityAvatar icon={UserRound} label={detail.fullName} className="size-16 sm:size-20" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{detail.fullName}</h2>
                  <Badge variant={detail.active ? 'success' : 'outline'}>{detail.active ? 'Activo' : 'Inactivo'}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">@{detail.username}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {detail.phone ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
                      <Phone className="size-3.5" />
                      {detail.phone}
                    </span>
                  ) : null}
                  {detail.email ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
                      <Mail className="size-3.5" />
                      {detail.email}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryCard title="Grupos" value={detail.groupCount} icon={Users} />
            <SummaryCard title="Alumnos activos" value={detail.activeStudentCount} icon={BookUser} />
            <SummaryCard title="Total alumnos" value={detail.students.length} icon={GraduationCap} />
            <SummaryCard title="Estado" value={detail.active ? 'Disponible' : 'Inactivo'} icon={UserRound} />
          </div>
        </div>
      </AppCard>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <AppCard title="Grupos asignados" description="Grupos actualmente vinculados a este catequista.">
          {detail.groups.length === 0 ? (
            <EmptyState title="Sin grupos" description="Este catequista aún no tiene grupos asignados." icon={Users} />
          ) : (
            <div className="space-y-3">
              {detail.groups.map((group) => (
                <Link
                  key={group.id}
                  to={`/app/groups/${group.id}`}
                  state={originState}
                  className="block rounded-[1rem] border border-border/70 bg-white p-4 transition hover:border-primary/20 hover:bg-secondary/35"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{group.schedule || 'Sin horario definido'}</p>
                    </div>
                    <Badge variant={group.active ? 'success' : 'outline'}>{group.active ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{group.studentCount} alumnos activos</p>
                </Link>
              ))}
            </div>
          )}
        </AppCard>

        <AppCard title="Alumnos a cargo" description="Listado de alumnos vinculados a los grupos de este catequista.">
          {detail.students.length === 0 ? (
            <EmptyState title="Sin alumnos" description="Todavía no hay alumnos registrados en sus grupos." icon={BookUser} />
          ) : (
            <div className="space-y-3">
              {detail.students.map((student) => (
                <Link
                  key={student.id}
                  to={`/app/students/${student.id}`}
                  state={originState}
                  className="block rounded-[1rem] border border-border/70 bg-white p-4 transition hover:border-primary/20 hover:bg-secondary/35"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{student.fullName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{student.groupName}{student.age != null ? ` • ${student.age} años` : ''}</p>
                    </div>
                    <Badge variant={student.active ? 'success' : 'outline'}>{student.active ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </AppCard>
      </div>
    </div>
  )
}
