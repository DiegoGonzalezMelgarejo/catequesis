import {
  Activity,
  BookUser,
  ChartColumn,
  ClipboardCheck,
  Layers3,
  TriangleAlert,
  UserRound,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { SummaryCard } from '@/components/app/summary-card'
import { useAsyncData } from '@/hooks/use-async-data'
import { useAuth } from '@/hooks/use-auth'
import { getDashboardData } from '@/services/dashboard-service'
import { formatDate, formatRelativeDate } from '@/utils/date'

export function DashboardPage() {
  const { user } = useAuth()
  const { data: dashboard, loading } = useAsyncData(
    () => (user ? getDashboardData(user) : Promise.resolve(null)),
    [user?.id, user?.role],
  )

  if (!user || loading || !dashboard) {
    return <PageSkeleton variant="dashboard" />
  }

  return dashboard.role === 'ADMIN' ? <AdminDashboard dashboard={dashboard} /> : <CatechistDashboard dashboard={dashboard} />
}

function QuickAction({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
    >
      {label}
    </Link>
  )
}

function AdminDashboard({ dashboard }: { dashboard: Awaited<ReturnType<typeof getDashboardData>> & { role: 'ADMIN' } }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Catequistas" value={dashboard.totalCatechists} icon={Users} to="/app/catechists" />
        <SummaryCard title="Grupos" value={dashboard.totalGroups} icon={Layers3} to="/app/groups" />
        <SummaryCard title="Alumnos" value={dashboard.totalStudents} icon={BookUser} to="/app/students" />
        <SummaryCard title="Sin catequista" value={dashboard.groupsWithoutCatechist} icon={TriangleAlert} to="/app/groups" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AppCard title="Accesos rápidos" description="Atajos para las acciones operativas del administrador.">
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickAction to="/app/catechists" label="Crear catequista" />
            <QuickAction to="/app/groups" label="Crear grupo" />
            <QuickAction to="/app/students" label="Registrar alumno" />
            <QuickAction to="/app/attendance" label="Asistencia por fecha" />
            <QuickAction to="/app/activities" label="Crear actividad" />
            <QuickAction to="/app/reports" label="Ver reportes" />
          </div>
        </AppCard>

        <AppCard title="Última asistencia" description="Último cierre de una jornada registrada.">
          {dashboard.latestAttendance ? (
            <div className="space-y-2">
              <Badge variant="secondary">{formatDate(dashboard.latestAttendance.date)}</Badge>
              <p className="text-sm text-muted-foreground">Actualizada {formatRelativeDate(dashboard.latestAttendance.updatedAt)}</p>
            </div>
          ) : (
            <EmptyState title="Sin asistencias" description="Aún no se han tomado asistencias." icon={ClipboardCheck} />
          )}
        </AppCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AppCard title="Alertas prioritarias" description="Casos que requieren intervención o seguimiento.">
          <div className="space-y-3">
            {dashboard.recentAlerts.length === 0 ? (
              <EmptyState title="Sin alertas" description="Todo se encuentra al día." icon={TriangleAlert} />
            ) : (
              dashboard.recentAlerts.map((alert) => (
                <div key={alert.id} className="rounded-3xl border bg-secondary/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{alert.title}</p>
                    <Badge variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'warning' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{alert.description}</p>
                </div>
              ))
            )}
          </div>
        </AppCard>

        <AppCard title="Próximas actividades" description="Seguimiento rápido a lo programado recientemente.">
          <div className="space-y-3">
            {dashboard.upcomingActivities.length === 0 ? (
              <EmptyState title="Sin actividades" description="No hay actividades programadas." icon={Activity} />
            ) : (
              dashboard.upcomingActivities.map((activity) => (
                <div key={activity.id} className="rounded-3xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.groupName}</p>
                    </div>
                    <Badge>{formatDate(activity.date, 'dd MMM')}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </AppCard>
      </div>
    </div>
  )
}

function CatechistDashboard({ dashboard }: { dashboard: Awaited<ReturnType<typeof getDashboardData>> & { role: 'CATECHIST' } }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Mis grupos" value={dashboard.groups.length} icon={Layers3} to="/app/groups" />
        <SummaryCard title="Alumnos" value={dashboard.totalStudents} icon={BookUser} to="/app/students" />
        <SummaryCard
          title="Última asistencia"
          value={dashboard.latestAttendance ? formatDate(dashboard.latestAttendance.date, 'dd MMM') : 'Sin registro'}
          icon={ClipboardCheck}
          to="/app/attendance"
        />
        <SummaryCard title="Próximas actividades" value={dashboard.upcomingActivities.length} icon={ChartColumn} to="/app/activities" />
      </div>

      <AppCard title="Accesos rápidos" description="Flujo optimizado para reuniones de catequesis.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/app/attendance" label="Asistencia por fecha" />
          <QuickAction to="/app/activities" label="Gestionar actividades" />
          <QuickAction to="/app/reports" label="Ver reportes" />
          <QuickAction to="/app/alerts" label="Revisar alertas" />
        </div>
      </AppCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <AppCard title="Mis grupos" description="Solo verás los grupos que tienes asignados.">
          <div className="space-y-3">
            {dashboard.groups.length === 0 ? (
              <EmptyState title="Sin grupos asignados" description="Un administrador debe asignarte al menos un grupo." icon={UserRound} />
            ) : (
              dashboard.groups.map((group) => (
                <Link
                  key={group.id}
                  to={`/app/groups/${group.id}`}
                  className="block rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">{group.studentCount} alumnos activos</p>
                    </div>
                    <Badge variant="secondary">{group.pendingActivities} pendientes</Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </AppCard>

        <AppCard title="Alertas recientes" description="Pendientes visibles solo en tus grupos.">
          <div className="space-y-3">
            {dashboard.recentAlerts.length === 0 ? (
              <EmptyState title="Sin alertas" description="No hay pendientes por resolver." icon={TriangleAlert} />
            ) : (
              dashboard.recentAlerts.map((alert) => (
                <div key={alert.id} className="rounded-3xl border bg-secondary/30 p-4">
                  <p className="font-medium">{alert.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{alert.description}</p>
                </div>
              ))
            )}
          </div>
        </AppCard>
      </div>
    </div>
  )
}
