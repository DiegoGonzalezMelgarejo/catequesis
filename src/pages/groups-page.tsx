import { useCallback, useState } from 'react'
import { Edit3, Layers3, ListFilter, MoreHorizontal, UserRoundX, Users } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ActionSheet, ActionSheetItem } from '@/components/app/action-sheet'
import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { EntityAvatar } from '@/components/app/entity-avatar'
import { MobilePageActionBar } from '@/components/app/mobile-page-action-bar'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PaginationControls } from '@/components/app/pagination-controls'
import { PrimaryButton } from '@/components/app/primary-button'
import { RefreshDataButton } from '@/components/app/refresh-data-button'
import { SearchInput } from '@/components/app/search-input'
import { SecondaryButton } from '@/components/app/secondary-button'
import { getDocumentsByField, getDocumentsByFieldIn } from '@/database/firestore-repository'
import { GroupForm, type EditableGroup } from '@/features/groups/group-form'
import { useAsyncData } from '@/hooks/use-async-data'
import { useActiveYear } from '@/hooks/use-active-year'
import { usePaginatedResource } from '@/hooks/use-paginated-resource'
import { useAuth } from '@/hooks/use-auth'
import { getAccessibleGroups } from '@/services/access-service'
import { getGroupsPage, setGroupActive } from '@/services/group-service'
import { formatYearLabel } from '@/utils/year'

function getAttendanceAction(group: Awaited<ReturnType<typeof getGroupsPage>>['items'][number]) {
  const today = new Date().toISOString().slice(0, 10)
  const hasAttendanceToday = group.lastAttendanceDate === today

  return {
    label: hasAttendanceToday ? 'Editar asistencia de hoy' : 'Tomar asistencia hoy',
    to: hasAttendanceToday
      ? `/app/attendance/session?groupId=${group.id}&date=${today}&mode=edit`
      : `/app/attendance/session?groupId=${group.id}&mode=new`,
  }
}

export function GroupsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { activeYear } = useActiveYear()
  const [search, setSearch] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<EditableGroup | null>(null)
  const [confirmState, setConfirmState] = useState<{ id: string; active: boolean; name: string } | null>(null)
  const [actionGroup, setActionGroup] = useState<Awaited<ReturnType<typeof getGroupsPage>>['items'][number] | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const fetchPage = useCallback(
    (cursor: Parameters<typeof getGroupsPage>[1], pageSize: number) => {
      if (!user) {
        return Promise.resolve({ items: [], nextCursor: null, hasMore: false })
      }

      return getGroupsPage(user, cursor, pageSize, activeYear ?? undefined, search)
    },
    [search, user, activeYear],
  )
  const {
    items: pagedGroups,
    loading: pageLoading,
    page,
    pageSize,
    hasNext,
    hasPrevious,
    goNext,
    goPrevious,
  } = usePaginatedResource<Awaited<ReturnType<typeof getGroupsPage>>['items'][number], Parameters<typeof getGroupsPage>[1]>({
    pageSize: 20,
    deps: [user?.id, user?.role, search],
    fetchPage,
  })

  const { data, loading } = useAsyncData(
    async () => {
      if (!user) {
        return null
      }

      const visibleGroupIds = pagedGroups.map((group) => group.id)

      const [catechists, userGroups, groups] = await Promise.all([
        getDocumentsByField<{ id: string; fullName: string; role: string; active: boolean }>('users', 'role', 'CATECHIST', {
          source: 'cache-first',
        }),
        visibleGroupIds.length > 0
          ? getDocumentsByFieldIn<{ id: string; userId: string; groupId: string }>('userGroups', 'groupId', visibleGroupIds, { source: 'cache-first' })
          : Promise.resolve([]),
        getAccessibleGroups(user, activeYear ?? undefined),
      ])

      return {
        catechists,
        userGroups,
        groups,
      }
    },
    [user?.id, user?.role, activeYear, pagedGroups.map((group) => group.id).join('|')],
  )

  if (!user || !activeYear || loading || pageLoading || !data) {
    return <PageSkeleton variant="list" />
  }

  const detailState = { from: location.pathname + location.search, label: 'Volver a grupos' }

  const filteredGroups = pagedGroups.filter((group) =>
    `${group.name} ${group.description ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  )

  const catechistOptions = data.catechists.filter((catechist) => catechist.active).map((catechist) => ({
    label: catechist.fullName,
    value: catechist.id,
  }))
  const groupsWithoutCatechist = filteredGroups.filter((group) => group.catechists.length === 0).length
  const activeGroups = filteredGroups.filter((group) => group.active).length
  const groupsWithPendingActivities = filteredGroups.filter((group) => group.pendingActivities > 0).length

  async function handleToggleGroup() {
    if (!confirmState) {
      return
    }

    try {
      await setGroupActive(confirmState.id, !confirmState.active)
      toast.success(confirmState.active ? 'Grupo inactivado.' : 'Grupo reactivado.')
      setConfirmState(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible actualizar el grupo.')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-3 sm:flex-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar grupo" />
          <div className="hidden h-11 items-center rounded-[0.875rem] border border-input bg-white px-4 text-sm text-muted-foreground sm:flex">{formatYearLabel(activeYear)}</div>
          <SecondaryButton className="sm:hidden" type="button" onClick={() => setShowFilters(true)}>
            <ListFilter className="size-4" />
            Ayuda
          </SecondaryButton>
        </div>
        <PrimaryButton asChild>
          <Link to="/app/attendance">
            Tomar asistencia
          </Link>
        </PrimaryButton>
        <RefreshDataButton className="hidden sm:inline-flex" cachePrefixes={['nav-', 'access-']} />
        {user.role === 'ADMIN' ? (
          <SecondaryButton
            className="hidden sm:inline-flex"
            type="button"
            onClick={() => {
              setSelectedGroup(null)
              setOpenForm(true)
            }}
          >
            <Layers3 className="size-4" />
            Nuevo grupo
          </SecondaryButton>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Grupos activos</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{activeGroups}</p>
          </div>
        </AppCard>
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Sin catequista</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{groupsWithoutCatechist}</p>
          </div>
        </AppCard>
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Con actividades pendientes</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{groupsWithPendingActivities}</p>
          </div>
        </AppCard>
      </div>

      {filteredGroups.length === 0 ? (
        <EmptyState title="Sin grupos" description="Ajusta la busqueda o crea un grupo nuevo para empezar a organizar el trabajo." icon={Layers3} />
      ) : (
        <>
          <AppCard title="Listado de grupos" description="Prioriza asistencia, estado del grupo y responsable asignado.">
            <div className="divide-y divide-border/70">
              {filteredGroups.map((group) => {
                const attendanceAction = getAttendanceAction(group)

                return (
                  <div key={group.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <EntityAvatar icon={Users} label={group.name} tone="warning" className="size-12" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" className="truncate text-left font-semibold hover:text-primary" onClick={() => navigate(`/app/groups/${group.id}`, { state: detailState })}>
                            {group.name}
                          </button>
                          <Badge variant={group.active ? 'success' : 'outline'} className="shrink-0">{group.active ? 'Activo' : 'Inactivo'}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{formatYearLabel(group.year)} • {group.schedule || 'Sin horario definido'} • {group.studentCount} alumnos</p>
                        <p className="text-xs text-muted-foreground">Catequista: {group.catechists[0] || 'Sin asignar'}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-secondary px-3 py-1">{group.pendingActivities} actividades pendientes</span>
                          <span className="rounded-full bg-secondary px-3 py-1">{group.lastAttendanceDate ? `Ultima asistencia ${group.lastAttendanceDate}` : 'Sin asistencia registrada'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      <PrimaryButton asChild>
                        <Link to={attendanceAction.to} state={{ from: location.pathname + location.search, label: 'Volver a grupos' }}>
                          Asistencia
                        </Link>
                      </PrimaryButton>
                      <SecondaryButton asChild>
                        <Link to={`/app/groups/${group.id}`} state={detailState}>
                          Abrir grupo
                        </Link>
                      </SecondaryButton>
                      <SecondaryButton type="button" size="icon" onClick={() => setActionGroup(group)}>
                        <MoreHorizontal className="size-4" />
                      </SecondaryButton>
                    </div>
                  </div>
                )
              })}
            </div>
          </AppCard>

          <PaginationControls
            page={page}
            pageSize={pageSize}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
            label="Grupos"
            onNext={goNext}
            onPrevious={goPrevious}
          />
        </>
      )}

      {user.role === 'ADMIN' ? (
        <MobilePageActionBar>
          <PrimaryButton
            className="w-full"
            type="button"
            onClick={() => {
              setSelectedGroup(null)
              setOpenForm(true)
            }}
          >
            <Layers3 className="size-4" />
            Nuevo grupo
          </PrimaryButton>
        </MobilePageActionBar>
      ) : null}

      {user.role === 'ADMIN' ? (
        <GroupForm open={openForm} onOpenChange={setOpenForm} group={selectedGroup} catechists={catechistOptions} />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmState(null)
          }
        }}
        title={confirmState?.active ? 'Inactivar grupo' : 'Reactivar grupo'}
        description={
          confirmState
            ? `${confirmState.active ? 'El grupo' : 'Se reactivara el grupo'} ${confirmState.name}.`
            : ''
        }
        confirmLabel={confirmState?.active ? 'Inactivar' : 'Reactivar'}
        onConfirm={handleToggleGroup}
      />

      <ActionSheet
        open={showFilters}
        onOpenChange={setShowFilters}
        title="Ayuda de uso"
        description="Estas trabajando dentro del año activo y esta guia te ayuda a encontrar rapido el grupo correcto."
      >
        <div className="space-y-4 px-1 pb-1 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Año activo:</span> {formatYearLabel(activeYear)}</p>
          <p>1. Usa la busqueda para ubicar el grupo.</p>
          <p>2. Entra por <span className="font-medium text-foreground">Asistencia</span> si estas en jornada.</p>
          <p>3. Usa <span className="font-medium text-foreground">Abrir grupo</span> para revisar alumnos y detalle.</p>
        </div>
      </ActionSheet>

      <ActionSheet
        open={Boolean(actionGroup)}
        onOpenChange={(open) => {
          if (!open) {
            setActionGroup(null)
          }
        }}
        title={actionGroup?.name ?? 'Acciones del grupo'}
        description="Selecciona la acción que deseas realizar."
      >
        <ActionSheetItem
          label="Ver grupo"
          icon={Users}
          onClick={() => {
            if (!actionGroup) return
            navigate(`/app/groups/${actionGroup.id}`, { state: detailState })
            setActionGroup(null)
          }}
        />
        <ActionSheetItem
          label="Ver asistencias"
          icon={Layers3}
          onClick={() => {
            if (!actionGroup) return
            navigate(`/app/attendance?groupId=${actionGroup.id}`, { state: { from: location.pathname + location.search, label: 'Volver a grupos' } })
            setActionGroup(null)
          }}
        />
        <ActionSheetItem
          label="Ver actividades"
          icon={Edit3}
          onClick={() => {
            if (!actionGroup) return
            navigate(`/app/activities?groupId=${actionGroup.id}`, { state: { from: location.pathname + location.search, label: 'Volver a grupos' } })
            setActionGroup(null)
          }}
        />
        {user.role === 'ADMIN' ? (
          <>
            <ActionSheetItem
              label="Editar grupo"
              icon={Edit3}
              onClick={() => {
                if (!actionGroup) return
                const groupCatechistIds = data.userGroups
                  .filter((assignment) => assignment.groupId === actionGroup.id)
                  .map((assignment) => assignment.userId)
                setSelectedGroup({
                  id: actionGroup.id,
                  name: actionGroup.name,
                  year: actionGroup.year,
                  schedule: actionGroup.schedule,
                  description: actionGroup.description,
                  catechistIds: groupCatechistIds,
                })
                setOpenForm(true)
                setActionGroup(null)
              }}
            />
            <ActionSheetItem
              label={actionGroup?.active ? 'Inactivar grupo' : 'Reactivar grupo'}
              icon={UserRoundX}
              tone={actionGroup?.active ? 'destructive' : 'default'}
              onClick={() => {
                if (!actionGroup) return
                setConfirmState({ id: actionGroup.id, active: actionGroup.active, name: actionGroup.name })
                setActionGroup(null)
              }}
            />
          </>
        ) : null}
      </ActionSheet>
    </div>
  )
}
