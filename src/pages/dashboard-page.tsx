import {
  BookUser,
  ChevronRight,
  ChartColumn,
  Layers3,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { AppCard } from '@/components/app/app-card'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { SummaryCard } from '@/components/app/summary-card'
import { useAsyncData } from '@/hooks/use-async-data'
import { useAuth } from '@/hooks/use-auth'
import { getDashboardData } from '@/services/dashboard-service'
import { formatDate } from '@/utils/date'

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

function ActionLanding({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions: Array<{ to: string; label: string; helper: string }>
}) {
  return (
    <AppCard title={title} description={description}>
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="rounded-[1rem] border border-border/70 bg-white px-4 py-4 transition hover:border-primary/20 hover:bg-secondary/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">{action.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{action.helper}</p>
              </div>
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </AppCard>
  )
}

function AdminDashboard({ dashboard }: { dashboard: Awaited<ReturnType<typeof getDashboardData>> & { role: 'ADMIN' } }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <ActionLanding
        title="¿Qué deseas hacer hoy?"
        description="Elige una tarea y continúa sin tener que buscarla en el menú."
        actions={[
          { to: '/app/attendance', label: 'Tomar asistencia', helper: 'Registrar la jornada del grupo.' },
          { to: '/app/students', label: 'Registrar alumno', helper: 'Crear o revisar una ficha de alumno.' },
          { to: '/app/groups', label: 'Gestionar grupos', helper: 'Crear grupos o revisar asignaciones.' },
          { to: '/app/catechists', label: 'Gestionar catequistas', helper: 'Crear catequistas o revisar su información.' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Catequistas" value={dashboard.totalCatechists} icon={Users} to="/app/catechists" />
        <SummaryCard title="Grupos" value={dashboard.totalGroups} icon={Layers3} to="/app/groups" />
        <SummaryCard title="Alumnos" value={dashboard.totalStudents} icon={BookUser} to="/app/students" />
        <SummaryCard title="Sin catequista" value={dashboard.groupsWithoutCatechist} icon={TriangleAlert} to="/app/groups" />
      </div>
    </div>
  )
}

function CatechistDashboard({ dashboard }: { dashboard: Awaited<ReturnType<typeof getDashboardData>> & { role: 'CATECHIST' } }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <ActionLanding
        title="¿Qué deseas hacer hoy?"
        description="Elige la tarea principal del encuentro para continuar más rápido."
        actions={[
          { to: '/app/attendance', label: 'Tomar asistencia', helper: 'Registrar presentes, ausentes y justificados.' },
          { to: '/app/groups', label: 'Ver mis grupos', helper: 'Abrir el grupo con el que vas a trabajar.' },
          { to: '/app/activities', label: 'Gestionar actividades', helper: 'Crear actividades o cargar notas.' },
          { to: '/app/alerts', label: 'Revisar alertas', helper: 'Ver pendientes importantes del grupo.' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Mis grupos" value={dashboard.groups.length} icon={Layers3} to="/app/groups" />
        <SummaryCard title="Alumnos" value={dashboard.totalStudents} icon={BookUser} to="/app/students" />
        <SummaryCard title="Asistencia" value={dashboard.latestAttendance ? formatDate(dashboard.latestAttendance.date, 'dd MMM') : 'Pendiente'} icon={ChartColumn} to="/app/attendance" />
        <SummaryCard title="Alertas" value={dashboard.recentAlerts.length} icon={TriangleAlert} to="/app/alerts" />
      </div>
    </div>
  )
}
