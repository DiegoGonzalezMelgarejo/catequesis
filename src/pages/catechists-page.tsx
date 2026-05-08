import { useCallback, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Edit3, MoreHorizontal, UserPlus, UserRound, UserRoundX } from 'lucide-react'
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
  const [actionCatechist, setActionCatechist] = useState<CatechistOverview | null>(null)

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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar catequista" />
        <PrimaryButton
          className="hidden sm:inline-flex"
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
          <div className="space-y-3">
            {filteredCatechists.map((catechist) => {
            const catechistGroupIds = data.userGroups.filter((assignment) => assignment.userId === catechist.id).map((assignment) => assignment.groupId)

            return (
              <AppCard key={catechist.id} interactive>
                <div className="space-y-3">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[1.25rem] bg-gradient-to-br from-primary/6 via-white to-cyan-400/5 p-3 text-left transition hover:bg-primary/5"
                    onClick={() => openCatechistEditor(catechist, catechistGroupIds)}
                  >
                    <EntityAvatar icon={UserRound} label={catechist.fullName} className="size-14 sm:size-16" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold sm:text-lg">{catechist.fullName}</p>
                          <p className="text-xs text-muted-foreground sm:text-sm">@{catechist.username}</p>
                        </div>
                        <Badge variant={catechist.active ? 'success' : 'outline'} className="hidden sm:inline-flex">
                          {catechist.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant={catechist.active ? 'success' : 'outline'} className="sm:hidden">
                          {catechist.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <Badge variant="outline">{catechist.groupCount} grupos</Badge>
                        {catechist.phone ? <Badge variant="outline">{catechist.phone}</Badge> : null}
                      </div>
                    </div>
                  </button>

                  <div className="rounded-[1.1rem] border border-white/70 bg-white/70 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Asignaciones:</span>{' '}
                    {catechist.groupNames.join(', ') || 'Sin asignar'}
                  </div>

                  <div className="flex items-center justify-end">
                    <SecondaryButton type="button" size="icon" onClick={() => setActionCatechist(catechist)}>
                      <MoreHorizontal className="size-4" />
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

      <MobilePageActionBar>
        <PrimaryButton
          className="w-full"
          type="button"
          onClick={() => {
            setSelectedCatechist(null)
            setOpenForm(true)
          }}
        >
          <UserPlus className="size-4" />
          Nuevo catequista
        </PrimaryButton>
      </MobilePageActionBar>

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

      <ActionSheet
        open={Boolean(actionCatechist)}
        onOpenChange={(open) => {
          if (!open) {
            setActionCatechist(null)
          }
        }}
        title={actionCatechist?.fullName ?? 'Acciones del catequista'}
        description="Selecciona la acción que deseas realizar."
      >
        <ActionSheetItem
          label="Editar catequista"
          icon={Edit3}
          onClick={() => {
            if (!actionCatechist) return
            const catechistGroupIds = data.userGroups
              .filter((assignment) => assignment.userId === actionCatechist.id)
              .map((assignment) => assignment.groupId)
            openCatechistEditor(actionCatechist, catechistGroupIds)
            setActionCatechist(null)
          }}
        />
        <ActionSheetItem
          label={actionCatechist?.active ? 'Inactivar catequista' : 'Reactivar catequista'}
          icon={UserRoundX}
          tone={actionCatechist?.active ? 'destructive' : 'default'}
          onClick={() => {
            if (!actionCatechist) return
            setConfirmState({
              id: actionCatechist.id,
              active: actionCatechist.active,
              name: actionCatechist.fullName,
            })
            setActionCatechist(null)
          }}
        />
      </ActionSheet>
    </div>
  )
}
