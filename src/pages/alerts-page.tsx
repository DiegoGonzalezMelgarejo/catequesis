import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bell, Clock3, ShieldAlert } from 'lucide-react'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PaginationControls } from '@/components/app/pagination-controls'
import { RefreshDataButton } from '@/components/app/refresh-data-button'
import { SearchInput } from '@/components/app/search-input'
import { useActiveYear } from '@/hooks/use-active-year'
import { useAsyncData } from '@/hooks/use-async-data'
import { useAuth } from '@/hooks/use-auth'
import { getAlertItems } from '@/services/alert-service'

const severityMeta = {
  high: {
    badge: 'destructive',
    icon: ShieldAlert,
    card: 'border-destructive/20 bg-destructive/5',
    iconWrap: 'bg-destructive/12 text-destructive',
  },
  medium: {
    badge: 'warning',
    icon: AlertTriangle,
    card: 'border-warning/25 bg-warning/10',
    iconWrap: 'bg-warning/20 text-foreground',
  },
  low: {
    badge: 'secondary',
    icon: Clock3,
    card: 'border-primary/15 bg-primary/5',
    iconWrap: 'bg-primary/10 text-primary',
  },
} as const

export function AlertsPage() {
  const { user } = useAuth()
  const { activeYear } = useActiveYear()
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [page, setPage] = useState(1)
  const { data: alerts, loading } = useAsyncData(
    () => (user && activeYear ? getAlertItems(user, activeYear) : Promise.resolve([])),
    [user?.id, user?.role, activeYear],
  )

  const filteredAlerts = useMemo(() => {
    const baseAlerts = alerts ?? []

    return baseAlerts.filter((alert) => {
      const matchesSeverity = severityFilter === 'all' ? true : alert.severity === severityFilter
      const matchesSearch =
        `${alert.title} ${alert.description} ${alert.groupName ?? ''} ${alert.studentName ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase())

      return matchesSeverity && matchesSearch
    })
  }, [alerts, search, severityFilter])

  const pagedAlerts = useMemo(() => filteredAlerts.slice((page - 1) * 20, page * 20), [filteredAlerts, page])
  const highAlerts = alerts?.filter((alert) => alert.severity === 'high').length ?? 0
  const mediumAlerts = alerts?.filter((alert) => alert.severity === 'medium').length ?? 0
  const lowAlerts = alerts?.filter((alert) => alert.severity === 'low').length ?? 0

  useEffect(() => {
    setPage(1)
  }, [search, severityFilter])

  if (!user || !activeYear) {
    return null
  }

  if (loading || !alerts) {
    return <PageSkeleton variant="list" />
  }

  return alerts.length === 0 ? (
    <EmptyState title="Sin alertas" description="No se detectaron riesgos ni pendientes relevantes en este momento." icon={Bell} />
  ) : (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-end">
        <RefreshDataButton cachePrefixes={['alerts-', 'nav-', 'access-']} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Alertas altas</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{highAlerts}</p>
          </div>
        </AppCard>
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Alertas medias</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{mediumAlerts}</p>
          </div>
        </AppCard>
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Alertas bajas</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{lowAlerts}</p>
          </div>
        </AppCard>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar alerta, grupo o alumno" />
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'high', label: 'Altas' },
            { key: 'medium', label: 'Medias' },
            { key: 'low', label: 'Bajas' },
          ].map((option) => {
            const active = severityFilter === option.key

            return (
              <button
                key={option.key}
                type="button"
                className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'border-border bg-secondary text-foreground'
                    : 'border-border/80 bg-white text-muted-foreground hover:bg-secondary/70'
                 }`}
                onClick={() => setSeverityFilter(option.key as 'all' | 'high' | 'medium' | 'low')}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {highAlerts > 0 ? (
        <AppCard title="Atencion prioritaria" description="Empieza por los casos de riesgo alto para no perder seguimiento importante.">
          <div className="rounded-[0.95rem] bg-destructive/5 px-4 py-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{highAlerts} alertas altas activas</p>
            <p className="mt-1">Filtra por prioridad alta si quieres revisar primero solo los casos urgentes.</p>
          </div>
        </AppCard>
      ) : null}

      {filteredAlerts.length === 0 ? (
        <EmptyState title="Sin coincidencias" description="Prueba otro texto de busqueda o cambia la prioridad para ver mas resultados." icon={Bell} />
      ) : (
        <>
          <AppCard title="Listado de alertas" description="Revisa primero la prioridad y luego el contexto del grupo o alumno afectado.">
            <div className="divide-y divide-border/70">
              {pagedAlerts.map((alert) => {
                const meta = severityMeta[alert.severity]
                const Icon = meta.icon

                return (
                  <div key={alert.id} className="py-4 first:pt-0 last:pb-0">
                    <div className={`rounded-[1rem] border px-4 py-4 ${meta.card}`}>
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 rounded-[0.85rem] p-2.5 ${meta.iconWrap}`}>
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{alert.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                              {alert.groupName || alert.studentName ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {[alert.groupName, alert.studentName].filter(Boolean).join(' • ')}
                                </p>
                              ) : null}
                            </div>
                            <Badge variant={meta.badge} className="shrink-0">{alert.severity}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </AppCard>

          <PaginationControls
            page={page}
            pageSize={20}
            hasNext={page * 20 < filteredAlerts.length}
            hasPrevious={page > 1}
            label="Alertas"
            onNext={() => setPage((current) => current + 1)}
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          />
        </>
      )}
    </div>
  )
}
