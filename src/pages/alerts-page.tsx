import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bell, Clock3, ShieldAlert } from 'lucide-react'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PaginationControls } from '@/components/app/pagination-controls'
import { SearchInput } from '@/components/app/search-input'
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
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [page, setPage] = useState(1)
  const { data: alerts, loading } = useAsyncData(
    () => (user ? getAlertItems(user) : Promise.resolve([])),
    [user?.id, user?.role],
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

  useEffect(() => {
    setPage(1)
  }, [search, severityFilter])

  if (!user) {
    return null
  }

  if (loading || !alerts) {
    return <PageSkeleton variant="list" />
  }

  return alerts.length === 0 ? (
    <EmptyState title="Sin alertas" description="No se detectaron riesgos ni pendientes." icon={Bell} />
  ) : (
    <div className="space-y-4">
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
                    ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
                    : 'border-white/70 bg-white text-muted-foreground hover:bg-secondary/70'
                }`}
                onClick={() => setSeverityFilter(option.key as 'all' | 'high' | 'medium' | 'low')}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <EmptyState title="Sin coincidencias" description="No hay alertas para el filtro actual." icon={Bell} />
      ) : (
        <>
          {pagedAlerts.map((alert) => {
          const meta = severityMeta[alert.severity]
          const Icon = meta.icon

          return (
            <AppCard key={alert.id} className={meta.card}>
            <div className="flex items-start gap-4">
              <div className={`rounded-[1.25rem] p-3 ${meta.iconWrap}`}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{alert.title}</p>
                  <Badge variant={meta.badge}>{alert.severity}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{alert.description}</p>
                {alert.groupName || alert.studentName ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {alert.groupName ? <Badge variant="outline">{alert.groupName}</Badge> : null}
                    {alert.studentName ? <Badge variant="outline">{alert.studentName}</Badge> : null}
                  </div>
                ) : null}
              </div>
            </div>
            </AppCard>
          )
          })}

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
