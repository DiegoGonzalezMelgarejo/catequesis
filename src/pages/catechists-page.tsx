import { useCallback, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ChevronRight, Edit3, UserPlus, UserRound, UserRoundX } from 'lucide-react'
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
import { CatechistForm, type EditableCatechist } from '@/features/catechists/catechist-form'
import { useAsyncData } from '@/hooks/use-async-data'
import { usePaginatedResource } from '@/hooks/use-paginated-resource'
import { useAuth } from '@/hooks/use-auth'
import {
  getCatechistsPage,
  setCatechistActive,
  type CatechistOverview,
} from '@/services/user-service'

export function CatechistsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [selectedCatechist, setSelectedCatechist] = useState<EditableCatechist | null>(null)
  const [confirmState, setConfirmState] = useState<{ id: string; active: boolean; name: string } | null>(null)

  const fetchPage = useCallback(
    (cursor: Parameters<typeof getCatechistsPage>[0], pageSize: number) =>
      getCatechistsPage(cursor, pageSize, search),
    [search],
  )
  const {
    items: pagedCatechists,
    loading: pageLoading,
    page,
    pageSize,
    hasNext,
    hasPrevious,
    goNext,
    goPrevious,
  } = usePaginatedResource<CatechistOverview, Parameters<typeof getCatechistsPage>[0]>({
    pageSize: 20,
    deps: [search],
    fetchPage,
  })

  const { data, loading } = useAsyncData(
    async () => {
      const [groups, userGroups] = await Promise.all([
        listDocuments<{ id: string; name: string; active: boolean }>('groups'),
        listDocuments<{ id: string; userId: string; groupId: string }>('userGroups'),
      ])
      return { groups, userGroups }
    },
    [user?.id],
  )

  if (!user) {
    return null
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/app/dashboard" replace />
  }

  if (loading || pageLoading || !data) {
    return <PageSkeleton variant="list" />
  }

  const groupOptions = data.groups.filter((group) => group.active).map((group) => ({ label: group.name, value: group.id }))
  const filteredCatechists = pagedCatechists.filter((catechist) =>
    `${catechist.fullName} ${catechist.username}`.toLowerCase().includes(search.toLowerCase()),
  )

  function openCatechistEditor(catechist: CatechistOverview, groupIds: string[]) {
    setSelectedCatechist({
      id: catechist.id,
      fullName: catechist.fullName,
      username: catechist.username,
      phone: catechist.phone,
      email: catechist.email,
      groupIds,
    })
    setOpenForm(true)
  }

  async function handleToggleCatechist() {
    if (!confirmState) {
      return
    }

    try {
      await setCatechistActive(confirmState.id, !confirmState.active)
      toast.success(confirmState.active ? 'Catequista inactivado.' : 'Catequista reactivado.')
      setConfirmState(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible actualizar el catequista.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar catequista" />
        <PrimaryButton
          type="button"
          onClick={() => {
            setSelectedCatechist(null)
            setOpenForm(true)
          }}
        >
          <UserPlus className="size-4" />
          Nuevo catequista
        </PrimaryButton>
      </div>

      {filteredCatechists.length === 0 ? (
        <EmptyState title="Sin catequistas" description="Crea el primer catequista para asignar grupos." icon={UserPlus} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredCatechists.map((catechist) => {
            const catechistGroupIds = data.userGroups.filter((assignment) => assignment.userId === catechist.id).map((assignment) => assignment.groupId)

            return (
              <AppCard key={catechist.id} interactive>
                <div className="space-y-4">
                  <button
                    type="button"
                    className="flex w-full items-start gap-4 rounded-[1.5rem] bg-gradient-to-br from-primary/6 via-white to-cyan-400/5 p-4 text-left transition hover:bg-primary/5"
                    onClick={() => openCatechistEditor(catechist, catechistGroupIds)}
                  >
                    <EntityAvatar icon={UserRound} label={catechist.fullName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold">{catechist.fullName}</p>
                          <p className="text-sm text-muted-foreground">@{catechist.username}</p>
                        </div>
                        <Badge variant={catechist.active ? 'success' : 'outline'}>
                          {catechist.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Toca la card para editar datos, credenciales y grupos asignados.
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
                  </button>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                      <p className="text-muted-foreground">Telefono</p>
                      <p className="mt-1 font-medium text-foreground">{catechist.phone || 'Sin telefono'}</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                      <p className="text-muted-foreground">Correo</p>
                      <p className="mt-1 truncate font-medium text-foreground">{catechist.email || 'Sin correo'}</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                      <p className="text-muted-foreground">Grupos</p>
                      <p className="mt-1 font-medium text-foreground">{catechist.groupCount}</p>
                    </div>
                  </div>

                  <div className="rounded-[1.25rem] border border-white/70 bg-white/70 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Asignaciones</p>
                    <p className="mt-1">{catechist.groupNames.join(', ') || 'Sin asignar'}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton
                      type="button"
                      onClick={() => openCatechistEditor(catechist, catechistGroupIds)}
                    >
                      <Edit3 className="size-4" />
                      Editar
                    </SecondaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={() =>
                        setConfirmState({
                          id: catechist.id,
                          active: catechist.active,
                          name: catechist.fullName,
                        })
                      }
                    >
                      <UserRoundX className="size-4" />
                      {catechist.active ? 'Inactivar' : 'Reactivar'}
                    </SecondaryButton>
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
            label="Catequistas"
            onNext={goNext}
            onPrevious={goPrevious}
          />
        </>
      )}

      <CatechistForm
        open={openForm}
        onOpenChange={setOpenForm}
        catechist={selectedCatechist}
        groups={groupOptions}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmState(null)
          }
        }}
        title={confirmState?.active ? 'Inactivar catequista' : 'Reactivar catequista'}
        description={
          confirmState
            ? `${confirmState.active ? 'Se ocultara el acceso de' : 'Se habilitara nuevamente a'} ${confirmState.name}.`
            : ''
        }
        confirmLabel={confirmState?.active ? 'Inactivar' : 'Reactivar'}
        onConfirm={handleToggleCatechist}
      />
    </div>
  )
}
