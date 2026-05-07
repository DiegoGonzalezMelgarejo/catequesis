import { useEffect, useMemo, useState } from 'react'
import { History, NotebookPen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { AppCard } from '@/components/app/app-card'
import { AppSelect } from '@/components/app/app-select'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PaginationControls } from '@/components/app/pagination-controls'
import { PrimaryButton } from '@/components/app/primary-button'
import { SearchInput } from '@/components/app/search-input'
import { SecondaryButton } from '@/components/app/secondary-button'
import { useAsyncData } from '@/hooks/use-async-data'
import { getAccessibleGroups } from '@/services/access-service'
import { getAttendanceHistoryByGroup } from '@/services/attendance-service'
import type { User } from '@/types/models'
import { formatDate } from '@/utils/date'

type AttendanceHistoryProps = {
  user: User
  initialGroupId?: string | null
}

export function AttendanceHistory({ user, initialGroupId }: AttendanceHistoryProps) {
  const navigate = useNavigate()
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId ?? '')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: groupsData, loading: groupsLoading } = useAsyncData(
    () => getAccessibleGroups(user),
    [user.id, user.role],
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

  if (groupsLoading && !groupsData) {
    return <PageSkeleton variant="detail" />
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <AppCard title="Histórico de asistencia" description="Consulta todas las fechas registradas del grupo y abre una toma existente para editarla.">
          <AppSelect
            label="Grupo"
            value={selectedGroupId}
            onValueChange={setSelectedGroupId}
            options={groups.filter((group) => group.active).map((group) => ({ label: group.name, value: group.id }))}
          />
        </AppCard>

        <PrimaryButton
          type="button"
          onClick={() => navigate(`/app/attendance/session?groupId=${selectedGroupId}&mode=new`)}
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
          description="Aún no hay fechas registradas para este grupo o no coinciden con la búsqueda."
          icon={History}
          action={
            <PrimaryButton
              onClick={() => navigate(`/app/attendance/session?groupId=${selectedGroupId}&mode=new`)}
              disabled={!selectedGroupId}
            >
              Crear primera toma
            </PrimaryButton>
          }
        />
      ) : (
        <div className="space-y-3">
          {pagedHistory.map((session) => (
            <AppCard key={session.id}>
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold">{formatDate(session.date, 'EEEE dd MMM yyyy')}</p>
                      <Badge variant="secondary">{session.records.length} alumnos</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {session.notes || 'Sin observaciones generales.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton
                      type="button"
                      onClick={() => navigate(`/app/attendance/session?groupId=${selectedGroupId}&date=${session.date}&mode=edit`)}
                    >
                      Editar toma
                    </SecondaryButton>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-success/20 bg-success/10 p-4 text-sm text-success">
                    <p className="text-muted-foreground">Presentes</p>
                    <p className="mt-1 font-medium">{session.counts.presentes}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                    <p className="text-muted-foreground">Ausentes</p>
                    <p className="mt-1 font-medium">{session.counts.ausentes}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-warning/25 bg-warning/15 p-4 text-sm text-foreground">
                    <p className="text-muted-foreground">Justificados</p>
                    <p className="mt-1 font-medium">{session.counts.justificados}</p>
                  </div>
                </div>
              </div>
            </AppCard>
          ))}

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
