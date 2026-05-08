import { useCallback, useEffect, useState } from 'react'
import { Edit3, Layers3, MoreHorizontal, UserRoundX, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
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
import { SearchInput } from '@/components/app/search-input'
import { SecondaryButton } from '@/components/app/secondary-button'
import { ViewModeToggle, type ViewMode } from '@/components/app/view-mode-toggle'
import { listDocuments } from '@/database/firestore-repository'
import { GroupForm, type EditableGroup } from '@/features/groups/group-form'
import { useAsyncData } from '@/hooks/use-async-data'
import { usePaginatedResource } from '@/hooks/use-paginated-resource'
import { useAuth } from '@/hooks/use-auth'
import { getGroupsPage, setGroupActive } from '@/services/group-service'

export function GroupsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<EditableGroup | null>(null)
  const [confirmState, setConfirmState] = useState<{ id: string; active: boolean; name: string } | null>(null)
  const [actionGroup, setActionGroup] = useState<Awaited<ReturnType<typeof getGroupsPage>>['items'][number] | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') {
      return 'cards'
    }

    return (window.localStorage.getItem('groups-view-mode') as ViewMode | null) ?? 'cards'
  })

  useEffect(() => {
    window.localStorage.setItem('groups-view-mode', viewMode)
  }, [viewMode])

  const fetchPage = useCallback(
    (cursor: Parameters<typeof getGroupsPage>[1], pageSize: number) => {
      if (!user) {
        return Promise.resolve({ items: [], nextCursor: null, hasMore: false })
      }

      return getGroupsPage(user, cursor, pageSize, search)
    },
    [search, user],
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

      const [catechists, userGroups] = await Promise.all([
        listDocuments<{ id: string; fullName: string; role: string; active: boolean }>('users'),
        listDocuments<{ id: string; userId: string; groupId: string }>('userGroups'),
      ])

      return {
        catechists: catechists.filter((catechist) => catechist.role === 'CATECHIST'),
        userGroups,
      }
    },
    [user?.id, user?.role],
  )

  if (!user || loading || pageLoading || !data) {
    return <PageSkeleton variant="list" />
  }

  const filteredGroups = pagedGroups.filter((group) =>
    `${group.name} ${group.description ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  )

  const catechistOptions = data.catechists.filter((catechist) => catechist.active).map((catechist) => ({
    label: catechist.fullName,
    value: catechist.id,
  }))

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
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
        {user.role === 'ADMIN' ? (
          <PrimaryButton
            className="hidden sm:inline-flex"
            type="button"
            onClick={() => {
              setSelectedGroup(null)
              setOpenForm(true)
            }}
          >
            <Layers3 className="size-4" />
            Nuevo grupo
          </PrimaryButton>
        ) : null}
      </div>

      {filteredGroups.length === 0 ? (
        <EmptyState title="Sin grupos" description="No se encontraron grupos para mostrar." icon={Layers3} />
      ) : (
        <>
          {viewMode === 'cards' ? (
            <div className="space-y-3">
              {filteredGroups.map((group) => (
                <AppCard key={group.id} interactive>
                  <div className="space-y-3">
                    <Link
                      to={`/app/groups/${group.id}`}
                      className="flex items-center gap-3 rounded-[1.25rem] bg-gradient-to-br from-primary/6 via-white to-cyan-400/5 p-3 transition hover:bg-primary/5"
                    >
                      <EntityAvatar icon={Users} label={group.name} tone="warning" className="size-14 sm:size-16" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-foreground sm:text-lg">{group.name}</p>
                            <p className="text-xs text-muted-foreground sm:text-sm">{group.schedule || 'Sin horario definido'}</p>
                          </div>
                          <Badge variant={group.active ? 'success' : 'outline'} className="hidden sm:inline-flex">
                            {group.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant={group.active ? 'success' : 'outline'} className="sm:hidden">
                            {group.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                          <Badge variant="outline">{group.studentCount} alumnos</Badge>
                          <Badge variant="outline">{group.pendingActivities} pendientes</Badge>
                        </div>
                      </div>
                    </Link>

                    <div className="rounded-[1.1rem] border border-white/70 bg-white/70 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Catequistas:</span>{' '}
                      {group.catechists.join(', ') || 'Sin asignar'}
                    </div>

                    <div className="flex items-center justify-end">
                      <SecondaryButton type="button" size="icon" onClick={() => setActionGroup(group)}>
                        <MoreHorizontal className="size-4" />
                      </SecondaryButton>
                    </div>
                  </div>
                </AppCard>
              ))}
            </div>
          ) : null}

          {viewMode === 'list' ? (
            <AppCard>
              <div className="divide-y divide-border/70">
                {filteredGroups.map((group) => (
                  <div key={group.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => navigate(`/app/groups/${group.id}`)}
                    >
                      <EntityAvatar icon={Users} label={group.name} tone="warning" className="size-12" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{group.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {group.schedule || 'Sin horario'} • {group.studentCount} alumnos • {group.catechists.join(', ') || 'Sin catequista'}
                        </p>
                      </div>
                    </button>
                    <Badge variant={group.active ? 'success' : 'outline'}>{group.active ? 'Activo' : 'Inactivo'}</Badge>
                    <SecondaryButton type="button" size="icon" onClick={() => setActionGroup(group)}>
                      <MoreHorizontal className="size-4" />
                    </SecondaryButton>
                  </div>
                ))}
              </div>
            </AppCard>
          ) : null}

          {viewMode === 'table' ? (
            <AppCard>
              <div className="no-scrollbar overflow-x-auto">
                <table className="min-w-[46rem] w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-muted-foreground">
                      <th className="px-3 py-3 font-medium">Grupo</th>
                      <th className="px-3 py-3 font-medium">Horario</th>
                      <th className="px-3 py-3 font-medium">Catequistas</th>
                      <th className="px-3 py-3 font-medium">Alumnos</th>
                      <th className="px-3 py-3 font-medium">Pendientes</th>
                      <th className="px-3 py-3 font-medium">Estado</th>
                      <th className="px-3 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map((group) => (
                      <tr key={group.id} className="border-b border-border/40">
                        <td className="px-3 py-3">
                          <button type="button" className="font-medium text-left hover:text-primary" onClick={() => navigate(`/app/groups/${group.id}`)}>
                            {group.name}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{group.schedule || 'Sin horario'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{group.catechists.join(', ') || 'Sin asignar'}</td>
                        <td className="px-3 py-3">{group.studentCount}</td>
                        <td className="px-3 py-3">{group.pendingActivities}</td>
                        <td className="px-3 py-3">
                          <Badge variant={group.active ? 'success' : 'outline'}>{group.active ? 'Activo' : 'Inactivo'}</Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <SecondaryButton type="button" size="icon" onClick={() => setActionGroup(group)}>
                            <MoreHorizontal className="size-4" />
                          </SecondaryButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AppCard>
          ) : null}

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
            navigate(`/app/groups/${actionGroup.id}`)
            setActionGroup(null)
          }}
        />
        <ActionSheetItem
          label="Ver asistencias"
          icon={Layers3}
          onClick={() => {
            if (!actionGroup) return
            navigate(`/app/attendance?groupId=${actionGroup.id}`)
            setActionGroup(null)
          }}
        />
        <ActionSheetItem
          label="Ver actividades"
          icon={Edit3}
          onClick={() => {
            if (!actionGroup) return
            navigate(`/app/activities?groupId=${actionGroup.id}`)
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
