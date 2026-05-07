import { useCallback, useState } from 'react'
import { ChevronRight, Edit3, Layers3, UserRoundX, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { EntityAvatar } from '@/components/app/entity-avatar'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PaginationControls } from '@/components/app/pagination-controls'
import { PrimaryButton } from '@/components/app/primary-button'
import { SearchInput } from '@/components/app/search-input'
import { SecondaryButton } from '@/components/app/secondary-button'
import { listDocuments } from '@/database/firestore-repository'
import { GroupForm, type EditableGroup } from '@/features/groups/group-form'
import { useAsyncData } from '@/hooks/use-async-data'
import { usePaginatedResource } from '@/hooks/use-paginated-resource'
import { useAuth } from '@/hooks/use-auth'
import { getGroupsPage, setGroupActive } from '@/services/group-service'

export function GroupsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<EditableGroup | null>(null)
  const [confirmState, setConfirmState] = useState<{ id: string; active: boolean; name: string } | null>(null)

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar grupo" />
        {user.role === 'ADMIN' ? (
          <PrimaryButton
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
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredGroups.map((group) => {
            const groupCatechistIds = data.userGroups.filter((assignment) => assignment.groupId === group.id).map((assignment) => assignment.userId)

            return (
              <AppCard key={group.id} interactive>
                <div className="space-y-4">
                  <Link
                    to={`/app/groups/${group.id}`}
                    className="flex items-start gap-4 rounded-[1.5rem] bg-gradient-to-br from-primary/6 via-white to-cyan-400/5 p-4 transition hover:bg-primary/5"
                  >
                    <EntityAvatar icon={Users} label={group.name} tone="warning" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-foreground">{group.name}</p>
                          <p className="text-sm text-muted-foreground">{group.schedule || 'Sin horario definido'}</p>
                        </div>
                        <Badge variant={group.active ? 'success' : 'outline'}>
                          {group.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Toca la card para ver alumnos, asistencia por días y el resumen del grupo.
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
                  </Link>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                      <p className="text-muted-foreground">Catequistas</p>
                      <p className="mt-1 font-medium">{group.catechists.join(', ') || 'Sin asignar'}</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                      <p className="text-muted-foreground">Alumnos activos</p>
                      <p className="mt-1 font-medium">{group.studentCount}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton asChild>
                      <Link to={`/app/groups/${group.id}`}>Ver grupo</Link>
                    </SecondaryButton>
                    <SecondaryButton asChild>
                      <Link to={`/app/attendance?groupId=${group.id}`}>Asistencias</Link>
                    </SecondaryButton>
                    <SecondaryButton asChild>
                      <Link to={`/app/activities?groupId=${group.id}`}>Actividades</Link>
                    </SecondaryButton>
                    {user.role === 'ADMIN' ? (
                      <>
                        <SecondaryButton
                          type="button"
                          onClick={() => {
                            setSelectedGroup({
                              id: group.id,
                              name: group.name,
                              schedule: group.schedule,
                              description: group.description,
                              catechistIds: groupCatechistIds,
                            })
                            setOpenForm(true)
                          }}
                        >
                          <Edit3 className="size-4" />
                          Editar
                        </SecondaryButton>
                        <SecondaryButton
                          type="button"
                          onClick={() => setConfirmState({ id: group.id, active: group.active, name: group.name })}
                        >
                          <UserRoundX className="size-4" />
                          {group.active ? 'Inactivar' : 'Reactivar'}
                        </SecondaryButton>
                      </>
                    ) : null}
                  </div>
                </div>
              </AppCard>
            )
            })}
          </div>

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
    </div>
  )
}
