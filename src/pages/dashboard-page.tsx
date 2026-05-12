import {
  ArrowUpRight,
  Bell,
  BookUser,
  ChevronRight,
  ChartColumn,
  CircleCheckBig,
  Clock3,
  FileCheck,
  Layers3,
  Landmark,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { RefreshDataButton } from '@/components/app/refresh-data-button'
import { SecondaryButton } from '@/components/app/secondary-button'
import { SummaryCard } from '@/components/app/summary-card'
import { YearManagementPanel } from '@/components/app/year-management-panel'
import { useActiveYear } from '@/hooks/use-active-year'
import { useAsyncData } from '@/hooks/use-async-data'
import { useAuth } from '@/hooks/use-auth'
import { getDashboardData } from '@/services/dashboard-service'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/date'
import { formatYearLabel } from '@/utils/year'

function getGreetingLabel() {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Buenos dias'
  }

  if (hour < 18) {
    return 'Buenas tardes'
  }

  return 'Buenas noches'
}

export function DashboardPage() {
  const { user } = useAuth()
  const { activeYear, availableYears, setActiveYear, createYearPeriod } = useActiveYear()
  const { data: dashboard, loading } = useAsyncData(
    () => (user && user.role !== 'SUPER_ADMIN' && activeYear ? getDashboardData(user, activeYear) : Promise.resolve(null)),
    [user?.id, user?.role, activeYear],
  )

  if (user?.role === 'SUPER_ADMIN') {
    return <SuperAdminDashboard />
  }

  if (!user || !activeYear || loading || !dashboard) {
    return <PageSkeleton variant="dashboard" />
  }

  return dashboard.role === 'ADMIN'
    ? <AdminDashboard userName={user.fullName} dashboard={dashboard} activeYear={activeYear} availableYears={availableYears} setActiveYear={setActiveYear} createYearPeriod={createYearPeriod} />
    : <CatechistDashboard userName={user.fullName} dashboard={dashboard} activeYear={activeYear} availableYears={availableYears} setActiveYear={setActiveYear} createYearPeriod={createYearPeriod} />
}

function SuperAdminDashboard() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <AppCard title="Control de plataforma" description="Desde aquí administras parroquias, administradores iniciales y la separación multitenant.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/app/parishes" className="rounded-[1rem] border border-border/70 bg-white px-4 py-5 transition hover:border-primary/20 hover:bg-secondary/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">Gestionar parroquias</p>
                <p className="mt-1 text-sm text-muted-foreground">Crea parroquias y asigna el administrador principal de cada una.</p>
              </div>
              <Landmark className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            </div>
          </Link>
        </div>
      </AppCard>
    </div>
  )
}

function ActiveYearPanel({
  activeYear,
  availableYears,
  setActiveYear,
  createYearPeriod,
  canCreateYearPeriod,
}: {
  activeYear: number
  availableYears: number[]
  setActiveYear: (year: number) => void
  createYearPeriod: (input: { year: number; observations?: string }) => Promise<void>
  canCreateYearPeriod: boolean
}) {
  return (
    <AppCard title="Año de trabajo" description="Cambia aquí el corte activo para ver, crear y editar datos del año correcto.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">Activo</Badge>
          <p className="font-semibold text-foreground">{formatYearLabel(activeYear)}</p>
        </div>
        <YearManagementPanel activeYear={activeYear} availableYears={availableYears} onSelectYear={setActiveYear} onCreateYear={createYearPeriod} canCreate={canCreateYearPeriod} />
      </div>
    </AppCard>
  )
}

function DashboardHero({
  title,
  description,
  userName,
  activeYear,
  primaryAction,
  secondaryAction,
  highlights,
}: {
  title: string
  description: string
  userName: string
  activeYear: number
  primaryAction: { to: string; label: string }
  secondaryAction: { to: string; label: string }
  highlights: Array<{ label: string; value: string | number; helper: string }>
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)] xl:items-stretch">
      <AppCard className="overflow-hidden border-primary/10 bg-[linear-gradient(135deg,rgba(109,94,252,0.12),rgba(255,255,255,0.98)_45%,rgba(255,255,255,0.98))] shadow-card">
        <div className="absolute inset-y-0 right-0 hidden w-56 bg-[radial-gradient(circle_at_top,rgba(109,94,252,0.16),transparent_62%)] lg:block" />
        <div className="relative flex h-full flex-col gap-5 sm:gap-6 lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">{getGreetingLabel()}</Badge>
              <Badge variant="secondary">{formatYearLabel(activeYear)}</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary">{userName}</p>
              <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem] lg:text-[2.35rem]">{title}</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">{description}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <SecondaryButton asChild className="min-h-12 justify-between rounded-[1rem] border-primary/20 bg-primary px-4 text-primary-foreground hover:bg-primary/95 hover:text-primary-foreground sm:min-w-[220px]">
              <Link to={primaryAction.to}>
                {primaryAction.label}
                <ArrowUpRight className="size-4" />
              </Link>
            </SecondaryButton>
            <SecondaryButton asChild className="min-h-12 justify-between rounded-[1rem] border-white/80 bg-white/90 px-4 sm:min-w-[220px]">
              <Link to={secondaryAction.to}>
                {secondaryAction.label}
                <ChevronRight className="size-4" />
              </Link>
            </SecondaryButton>
          </div>
        </div>
      </AppCard>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 xl:gap-4">
        {highlights.map((item) => (
          <AppCard key={item.label} className="h-full border-border/70 bg-white/98">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">{item.value}</p>
              <p className="text-sm leading-6 text-muted-foreground">{item.helper}</p>
            </div>
          </AppCard>
        ))}
      </div>
    </section>
  )
}

function ActionLanding({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions: Array<{ to: string; label: string; helper: string; featured?: boolean }>
}) {
  return (
    <AppCard title={title} description={description}>
      <div className="grid gap-3 lg:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={action.featured
              ? 'rounded-[1.15rem] border border-primary/20 bg-primary px-4 py-5 text-primary-foreground shadow-soft transition hover:opacity-95 lg:col-span-2'
              : 'rounded-[1.15rem] border border-border/70 bg-white px-4 py-4 transition hover:border-primary/20 hover:bg-secondary/50'}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cn('text-base font-semibold', action.featured ? 'text-primary-foreground' : 'text-foreground')}>{action.label}</p>
                <p className={cn('mt-1 text-sm', action.featured ? 'text-primary-foreground/85' : 'text-muted-foreground')}>{action.helper}</p>
              </div>
              <ChevronRight className={cn('mt-0.5 size-4 shrink-0', action.featured ? 'text-primary-foreground' : 'text-muted-foreground')} />
            </div>
          </Link>
        ))}
      </div>
    </AppCard>
  )
}

function WorkQueue({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: Array<{ title: string; helper: string; to: string; tone?: 'default' | 'warning' }>
}) {
  return (
    <AppCard title={title} description={description}>
      {items.length === 0 ? (
        <div className="rounded-[1rem] bg-secondary/35 px-4 py-4 text-sm leading-6 text-muted-foreground">
          No hay elementos pendientes para revisar ahora.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={`${item.to}-${item.title}`}
              to={item.to}
              className="flex items-start justify-between gap-3 rounded-[1rem] border border-border/70 bg-white px-4 py-4 transition hover:border-primary/20 hover:bg-secondary/40"
            >
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.helper}</p>
              </div>
              <ChevronRight className={cn('mt-0.5 size-4 shrink-0', item.tone === 'warning' ? 'text-warning' : 'text-muted-foreground')} />
            </Link>
          ))}
        </div>
      )}
    </AppCard>
  )
}

function AdminDashboard({ userName, dashboard, activeYear, availableYears, setActiveYear, createYearPeriod }: { userName: string; dashboard: Awaited<ReturnType<typeof getDashboardData>> & { role: 'ADMIN' }; activeYear: number; availableYears: number[]; setActiveYear: (year: number) => void; createYearPeriod: (input: { year: number; observations?: string }) => Promise<void> }) {
  const todayItems = [
    { to: '/app/attendance', label: 'Tomar asistencia', helper: 'Abre la jornada y registra presentes.', featured: true },
    { to: '/app/groups', label: 'Revisar grupos', helper: 'Confirma horarios, asignaciones y estado.' },
    { to: '/app/students', label: 'Actualizar alumnos', helper: 'Corrige fichas y documentos pendientes.' },
  ]

  const pendingItems = [
    dashboard.groupsWithoutCatechist > 0
      ? {
          title: `${dashboard.groupsWithoutCatechist} grupos sin catequista`,
          helper: 'Conviene asignarlos antes del siguiente encuentro.',
          to: '/app/groups',
          tone: 'warning' as const,
        }
      : null,
    dashboard.recentAlerts.length > 0
      ? {
          title: `${dashboard.recentAlerts.length} alertas activas`,
          helper: 'Revisa casos con riesgo o seguimiento pendiente.',
          to: '/app/alerts',
          tone: 'warning' as const,
        }
      : null,
    {
      title: 'Configurar checklist y documentos',
      helper: 'Mantiene uniforme el seguimiento por sacramento.',
      to: '/app/more',
    },
  ].filter(Boolean) as Array<{ title: string; helper: string; to: string; tone?: 'default' | 'warning' }>

  return (
    <div className="space-y-5 sm:space-y-6 xl:space-y-7">
      <div className="flex justify-end">
        <RefreshDataButton cachePrefixes={['dashboard-', 'alerts-', 'nav-', 'access-']} />
      </div>
      <DashboardHero
        title="Controla la operacion del año pastoral desde una vista clara y ejecutiva."
        description="Revisa el estado general, entra rápido a la tarea principal del día y mantén visibles los puntos que requieren seguimiento antes de la próxima jornada."
        userName={userName}
        activeYear={activeYear}
        primaryAction={{ to: '/app/attendance', label: 'Abrir asistencia del dia' }}
        secondaryAction={{ to: '/app/groups', label: 'Revisar organizacion de grupos' }}
        highlights={[
          {
            label: 'Cobertura actual',
            value: `${dashboard.totalGroups - dashboard.groupsWithoutCatechist}/${dashboard.totalGroups}`,
            helper: 'Grupos con acompañamiento asignado para el año activo.',
          },
          {
            label: 'Alertas activas',
            value: dashboard.recentAlerts.length,
            helper: 'Casos que conviene revisar antes del siguiente encuentro.',
          },
          {
            label: 'Base pastoral',
            value: dashboard.totalStudents,
            helper: 'Alumnos registrados dentro del periodo de trabajo actual.',
          },
        ]}
      />

      <ActionLanding
        title="Trabajo de hoy"
        description="Empieza por la tarea principal y luego continua con seguimiento y actualizacion."
        actions={todayItems}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Catequistas" value={dashboard.totalCatechists} icon={Users} to="/app/catechists" />
        <SummaryCard title="Grupos" value={dashboard.totalGroups} icon={Layers3} to="/app/groups" />
        <SummaryCard title="Alumnos" value={dashboard.totalStudents} icon={BookUser} to="/app/students" />
        <SummaryCard title="Sin catequista" value={dashboard.groupsWithoutCatechist} icon={TriangleAlert} to="/app/groups" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-start">
        <div className="space-y-4">
          <WorkQueue
            title="Pendientes prioritarios"
            description="Lo que conviene resolver para evitar atrasos en la operacion diaria."
            items={pendingItems}
          />
        </div>

        <div className="space-y-4">
          <ActiveYearPanel activeYear={activeYear} availableYears={availableYears} setActiveYear={setActiveYear} createYearPeriod={createYearPeriod} canCreateYearPeriod />

          <AppCard title="Accesos rapidos" description="Herramientas de control y configuracion complementaria.">
            <div className="space-y-3">
              <Link to="/app/reports" className="flex items-center justify-between rounded-[1rem] bg-secondary/35 px-4 py-3 text-sm transition hover:bg-secondary/55">
                <div className="flex items-center gap-3"><ChartColumn className="size-4 text-primary" /> Reportes y exportaciones</div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
              <Link to="/app/checklists" className="flex items-center justify-between rounded-[1rem] bg-secondary/35 px-4 py-3 text-sm transition hover:bg-secondary/55">
                <div className="flex items-center gap-3"><CircleCheckBig className="size-4 text-primary" /> Checklist doctrinal</div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
              <Link to="/app/documents" className="flex items-center justify-between rounded-[1rem] bg-secondary/35 px-4 py-3 text-sm transition hover:bg-secondary/55">
                <div className="flex items-center gap-3"><FileCheck className="size-4 text-primary" /> Documentos requisito</div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  )
}

function CatechistDashboard({ userName, dashboard, activeYear, availableYears, setActiveYear, createYearPeriod }: { userName: string; dashboard: Awaited<ReturnType<typeof getDashboardData>> & { role: 'CATECHIST' }; activeYear: number; availableYears: number[]; setActiveYear: (year: number) => void; createYearPeriod: (input: { year: number; observations?: string }) => Promise<void> }) {
  const todayItems = [
    { to: '/app/attendance', label: 'Tomar asistencia', helper: 'Marca presentes, ausentes y justificados.', featured: true },
    { to: '/app/groups', label: 'Abrir mis grupos', helper: 'Entra rapido al grupo con el que trabajas hoy.' },
    { to: '/app/activities', label: 'Registrar actividades', helper: 'Carga tareas, notas y observaciones.' },
  ]

  const pendingItems = [
    dashboard.recentAlerts.length > 0
      ? {
          title: `${dashboard.recentAlerts.length} alertas activas`,
          helper: 'Revisa alumnos o grupos que requieren atencion.',
          to: '/app/alerts',
          tone: 'warning' as const,
        }
      : null,
    dashboard.upcomingActivities.length > 0
      ? {
          title: `${dashboard.upcomingActivities.length} actividades proximas`,
          helper: 'Confirma fecha, grupo y evaluacion antes del encuentro.',
          to: '/app/activities',
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; helper: string; to: string; tone?: 'default' | 'warning' }>

  return (
    <div className="space-y-5 sm:space-y-6 xl:space-y-7">
      <div className="flex justify-end">
        <RefreshDataButton cachePrefixes={['dashboard-', 'alerts-', 'nav-', 'access-']} />
      </div>
      <DashboardHero
        title="Organiza tu jornada con accesos directos y un estado visible de tus grupos."
        description="Empieza por la asistencia o por el grupo del día, revisa alertas relevantes y mantén a la mano el contexto del año de trabajo sin perder tiempo navegando."
        userName={userName}
        activeYear={activeYear}
        primaryAction={{ to: '/app/attendance', label: 'Registrar asistencia ahora' }}
        secondaryAction={{ to: '/app/groups', label: 'Entrar a mis grupos' }}
        highlights={[
          {
            label: 'Mis grupos',
            value: dashboard.groups.length,
            helper: 'Espacios asignados actualmente para acompañamiento.',
          },
          {
            label: 'Ultimo registro',
            value: dashboard.latestAttendance ? formatDate(dashboard.latestAttendance.date, 'dd MMM') : 'Pendiente',
            helper: 'Fecha de la asistencia más reciente dentro del año activo.',
          },
          {
            label: 'Seguimiento activo',
            value: dashboard.recentAlerts.length,
            helper: 'Alertas o casos que requieren revisar observaciones.',
          },
        ]}
      />

      <ActionLanding
        title="Trabajo de hoy"
        description="Empieza por la actividad principal del encuentro y luego continua el seguimiento."
        actions={todayItems}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Mis grupos" value={dashboard.groups.length} icon={Layers3} to="/app/groups" />
        <SummaryCard title="Alumnos" value={dashboard.totalStudents} icon={BookUser} to="/app/students" />
        <SummaryCard title="Asistencia" value={dashboard.latestAttendance ? formatDate(dashboard.latestAttendance.date, 'dd MMM') : 'Pendiente'} icon={ChartColumn} to="/app/attendance" />
        <SummaryCard title="Alertas" value={dashboard.recentAlerts.length} icon={TriangleAlert} to="/app/alerts" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-start">
        <WorkQueue
          title="Pendientes prioritarios"
          description="Casos y actividades que vale la pena revisar antes de cerrar la jornada."
          items={pendingItems}
        />

        <div className="space-y-4">
          <ActiveYearPanel activeYear={activeYear} availableYears={availableYears} setActiveYear={setActiveYear} createYearPeriod={createYearPeriod} canCreateYearPeriod={false} />

          <AppCard title="Contexto rapido" description="Resumen formal del estado reciente de tu trabajo.">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 rounded-[1rem] bg-secondary/35 px-4 py-3">
                <Clock3 className="size-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Ultima asistencia</p>
                  <p className="text-muted-foreground">
                    {dashboard.latestAttendance ? formatDate(dashboard.latestAttendance.date) : 'Aún no registrada'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[1rem] bg-secondary/35 px-4 py-3">
                <Bell className="size-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Alertas vigentes</p>
                  <p className="text-muted-foreground">{dashboard.recentAlerts.length} casos por revisar.</p>
                </div>
              </div>
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  )
}
