import { useEffect, useMemo, useState } from 'react'
import { History, NotebookPen } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { AppCard } from '@/components/app/app-card'
import { AppSelect } from '@/components/app/app-select'
import { EmptyState } from '@/components/app/empty-state'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PaginationControls } from '@/components/app/pagination-controls'
import { PrimaryButton } from '@/components/app/primary-button'
import { SearchInput } from '@/components/app/search-input'
import { SecondaryButton } from '@/components/app/secondary-button'
import { useActiveYear } from '@/hooks/use-active-year'
import { useAsyncData } from '@/hooks/use-async-data'
import { getAccessibleGroups } from '@/services/access-service'
import { getAttendanceHistoryByGroup } from '@/services/attendance-service'
import type { User } from '@/types/models'
import { formatDate } from '@/utils/date'
import { formatYearLabel } from '@/utils/year'

type AttendanceHistoryProps = {
  user: User
  initialGroupId?: string | null
}

export function AttendanceHistory({ user, initialGroupId }: AttendanceHistoryProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeYear } = useActiveYear()
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId ?? '')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: groupsData, loading: groupsLoading } = useAsyncData(
    () => getAccessibleGroups(user, activeYear ?? undefined),
    [user.id, user.role, activeYear],
  )
  const { data: historyData, loading: historyLoading } = useAsyncData(
    () => (selectedGroupId ? getAttendanceHistoryByGroup(selectedGroupId) : Promise.resolve([])),
    [selectedGroupId],
  )

  const groups = groupsData ?? []
  const history = historyData ?? []

  useEffect(() => {
    if (!selectedGroupId && groups[0]) {
      setSelectedGroupId(groups[0].id)
    }
  }, [groups, selectedGroupId])

  useEffect(() => {
    if (initialGroupId) {
      setSelectedGroupId(initialGroupId)
    }
  }, [initialGroupId])

  useEffect(() => {
    setPage(1)
  }, [search, selectedGroupId])

  const filteredHistory = useMemo(
    () =>
      history.filter((session) =>
        `${session.date} ${session.notes ?? ''} ${session.records.map((record) => record.studentName).join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [history, search],
  )

  const pagedHistory = useMemo(
    () => filteredHistory.slice((page - 1) * 20, page * 20),
    [filteredHistory, page],
  )
  const selectedGroup = groups.find((group) => group.id === selectedGroupId)
  const selectedGroupName = selectedGroup ? `${selectedGroup.name} · ${selectedGroup.year}` : undefined
  const latestSession = history[0]

  if (groupsLoading && !groupsData) {
    return <PageSkeleton variant="detail" />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Grupo actual</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{selectedGroupName ?? 'Sin grupo'}</p>
          </div>
        </AppCard>
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Jornadas registradas</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{history.length}</p>
          </div>
        </AppCard>
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Ultima jornada</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{latestSession ? formatDate(latestSession.date, 'dd MMM yyyy') : 'Sin registro'}</p>
          </div>
        </AppCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <AppCard title="Histórico de asistencia" description="Consulta todas las fechas registradas del grupo y abre una toma existente para editarla.">
          <AppSelect
            label="Grupo"
            value={selectedGroupId}
            onValueChange={setSelectedGroupId}
            options={groups.filter((group) => group.active).map((group) => ({ label: `${group.name} · ${group.year}`, value: group.id, description: formatYearLabel(group.year) }))}
          />
        </AppCard>

        <PrimaryButton
          type="button"
          onClick={() => navigate(`/app/attendance/session?groupId=${selectedGroupId}&mode=new`, { state: { from: location.pathname + location.search, label: 'Volver al histórico' } })}
          disabled={!selectedGroupId}
          className="h-12"
        >
          <NotebookPen className="size-4" />
          Nueva toma de asistencia
        </PrimaryButton>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar fecha, observación o estudiante"
      />

      {historyLoading ? (
        <PageSkeleton variant="detail" />
      ) : filteredHistory.length === 0 ? (
          <EmptyState
            title="Sin historial"
            description="Todavia no hay jornadas registradas para este grupo o la busqueda no encontro coincidencias."
            icon={History}
          action={
              <PrimaryButton
                onClick={() => navigate(`/app/attendance/session?groupId=${selectedGroupId}&mode=new`, { state: { from: location.pathname + location.search, label: 'Volver al histórico' } })}
                disabled={!selectedGroupId}
              >
              Crear primera toma
            </PrimaryButton>
          }
        />
      ) : (
        <div className="space-y-4">
          <AppCard title="Fechas registradas" description="Revisa primero el resumen del dia y luego abre la toma para editarla si hace falta.">
            <div className="divide-y divide-border/70">
              {pagedHistory.map((session) => (
                <div key={session.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold">{formatDate(session.date, 'dd MMM yyyy')}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-secondary px-3 py-1">{session.counts.presentes} presentes</span>
                        <span className="rounded-full bg-secondary px-3 py-1">{session.counts.ausentes} ausentes</span>
                        <span className="rounded-full bg-secondary px-3 py-1">{session.counts.justificados} justificados</span>
                      </div>
                      {session.notes ? <p className="mt-1 text-xs text-muted-foreground">{session.notes}</p> : null}
                    </div>
                    <SecondaryButton
                      type="button"
                      onClick={() => navigate(`/app/attendance/session?groupId=${selectedGroupId}&date=${session.date}&mode=edit`, { state: { from: location.pathname + location.search, label: 'Volver al histórico' } })}
                    >
                      Abrir
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          </AppCard>

          <PaginationControls
            page={page}
            pageSize={20}
            hasNext={page * 20 < filteredHistory.length}
            hasPrevious={page > 1}
            label="Fechas registradas"
            onNext={() => setPage((current) => current + 1)}
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          />
        </div>
      )}
    </div>
  )
}
