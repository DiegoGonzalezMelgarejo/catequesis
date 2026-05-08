import { useCallback, useMemo, useState } from 'react'
import { CalendarDays, ClipboardPen, Edit3, NotebookPen } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PaginationControls } from '@/components/app/pagination-controls'
import { PrimaryButton } from '@/components/app/primary-button'
import { SearchInput } from '@/components/app/search-input'
import { SecondaryButton } from '@/components/app/secondary-button'
import { ActivityForm, type EditableActivity } from '@/features/activities/activity-form'
import { GradeSheet } from '@/features/activities/grade-sheet'
import { useAsyncData } from '@/hooks/use-async-data'
import { usePaginatedResource } from '@/hooks/use-paginated-resource'
import { useAuth } from '@/hooks/use-auth'
import { useBackNavigation } from '@/hooks/use-back-navigation'
import { getActivitiesPage, setActivityActive } from '@/services/activity-service'
import { getAccessibleGroups } from '@/services/access-service'
import { formatDate } from '@/utils/date'

export function ActivitiesPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [groupFilter, setGroupFilter] = useState(searchParams.get('groupId') ?? '')
  const [search, setSearch] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<EditableActivity | null>(null)
  const [gradeActivityId, setGradeActivityId] = useState<string | null>(null)
  const { backLabel, backTo } = useBackNavigation('/app/dashboard', 'Volver al panel')

  const fetchPage = useCallback(
    (cursor: Parameters<typeof getActivitiesPage>[1], pageSize: number) => {
      if (!user) {
        return Promise.resolve({ items: [], nextCursor: null, hasMore: false })
      }

      return getActivitiesPage(user, cursor, pageSize, groupFilter || undefined)
    },
    [groupFilter, user],
  )
  const {
    items: pagedActivities,
    loading: pageLoading,
    page,
    pageSize,
    hasNext,
    hasPrevious,
    goNext,
    goPrevious,
  } = usePaginatedResource<Awaited<ReturnType<typeof getActivitiesPage>>['items'][number], Parameters<typeof getActivitiesPage>[1]>({
    pageSize: 20,
    deps: [user?.id, user?.role, groupFilter],
    fetchPage,
  })

  const { data, loading } = useAsyncData(
    async () => {
      if (!user) {
        return null
      }

      const groups = await getAccessibleGroups(user)

      return { groups }
    },
    [user?.id, user?.role, groupFilter],
  )

  const filteredActivities = useMemo(
    () =>
      pagedActivities.filter((activity) =>
        `${activity.title} ${activity.groupName} ${activity.type}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [pagedActivities, search],
  )

  if (!user || loading || pageLoading || !data) {
    return <PageSkeleton variant="list" />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {(location.state as { from?: string } | null)?.from ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
          <SecondaryButton asChild>
            <Link to={backTo}>{backLabel}</Link>
          </SecondaryButton>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar actividad" />
          <select className="h-11 rounded-[0.875rem] border border-input bg-white px-4 text-sm" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            <option value="">Todos los grupos</option>
            {data.groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <PrimaryButton type="button" onClick={() => { setSelectedActivity(null); setOpenForm(true) }}>
          <NotebookPen className="size-4" />
          Nueva actividad
        </PrimaryButton>
      </div>

      {filteredActivities.length === 0 ? (
        <EmptyState title="Sin actividades" description="Crea la primera actividad del grupo." icon={NotebookPen} />
      ) : (
        <div className="space-y-4">
          <AppCard title="Listado de actividades" description="Vista simple para abrir una actividad y registrar o revisar notas.">
            <div className="divide-y divide-border/70">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="truncate font-semibold">{activity.title}</p>
                        <Badge variant={activity.active ? 'default' : 'outline'} className="shrink-0">{activity.type}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activity.groupName} • {formatDate(activity.date)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Notas: {activity.gradedCount}/{activity.studentCount} • Máxima: {activity.maxGrade}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <SecondaryButton type="button" onClick={() => setGradeActivityId(activity.id)}>
                        <ClipboardPen className="size-4" />
                        Abrir
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        size="icon"
                        onClick={() => {
                          setSelectedActivity({
                            id: activity.id,
                            groupId: activity.groupId,
                            title: activity.title,
                            description: activity.description,
                            date: activity.date,
                            maxGrade: activity.maxGrade,
                            type: activity.type,
                          })
                          setOpenForm(true)
                        }}
                      >
                        <Edit3 className="size-4" />
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        size="icon"
                        onClick={async () => {
                          try {
                            await setActivityActive(activity.id, !activity.active)
                            toast.success(activity.active ? 'Actividad inactivada.' : 'Actividad reactivada.')
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : 'No fue posible actualizar la actividad.')
                          }
                        }}
                      >
                        <CalendarDays className="size-4" />
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AppCard>

          <PaginationControls
            page={page}
            pageSize={pageSize}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
            label="Actividades"
            onNext={goNext}
            onPrevious={goPrevious}
          />
        </div>
      )}

      <ActivityForm
        open={openForm}
        onOpenChange={setOpenForm}
        activity={selectedActivity}
        groupOptions={data.groups.filter((group) => group.active).map((group) => ({ label: group.name, value: group.id }))}
        currentUserId={user.id}
      />

      <GradeSheet open={Boolean(gradeActivityId)} onOpenChange={(open) => !open && setGradeActivityId(null)} activityId={gradeActivityId} user={user} />
    </div>
  )
}
