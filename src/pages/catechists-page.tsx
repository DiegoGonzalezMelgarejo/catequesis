import { useCallback, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Edit3, ListFilter, MoreHorizontal, UserPlus, UserRound, UserRoundX } from 'lucide-react'
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
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [selectedCatechist, setSelectedCatechist] = useState<EditableCatechist | null>(null)
  const [confirmState, setConfirmState] = useState<{ id: string; active: boolean; name: string } | null>(null)
  const [actionCatechist, setActionCatechist] = useState<CatechistOverview | null>(null)
  const [showFilters, setShowFilters] = useState(false)

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

  const filteredCatechists = pagedCatechists.filter((catechist) =>
    `${catechist.fullName} ${catechist.username}`.toLowerCase().includes(search.toLowerCase()),
  )
  const activeCatechists = filteredCatechists.filter((catechist) => catechist.active).length
  const withoutGroups = filteredCatechists.filter((catechist) => catechist.groupCount === 0).length
  const withContact = filteredCatechists.filter((catechist) => catechist.email || catechist.phone).length

  function openCatechistEditor(catechist: CatechistOverview) {
    setSelectedCatechist({
      id: catechist.id,
      fullName: catechist.fullName,
      username: catechist.username,
      phone: catechist.phone,
      email: catechist.email,
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

  const detailState = { from: location.pathname + location.search, label: 'Volver a catequistas' }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-3 sm:flex-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar catequista" />
          <SecondaryButton className="sm:hidden" type="button" onClick={() => setShowFilters(true)}>
            <ListFilter className="size-4" />
            Ayuda
          </SecondaryButton>
        </div>
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

      <div className="grid gap-3 sm:grid-cols-3">
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{activeCatechists}</p>
          </div>
        </AppCard>
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Sin grupos</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{withoutGroups}</p>
          </div>
        </AppCard>
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Con contacto</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{withContact}</p>
          </div>
        </AppCard>
      </div>

      {filteredCatechists.length === 0 ? (
        <EmptyState title="Sin catequistas" description="Crea el primer catequista para asignar grupos." icon={UserPlus} />
      ) : (
        <>
          <AppCard title="Listado de catequistas" description="Ubica rapido a cada responsable, su contacto y sus grupos asignados.">
            <div className="divide-y divide-border/70">
              {filteredCatechists.map((catechist) => (
                <div key={catechist.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <EntityAvatar icon={UserRound} label={catechist.fullName} className="size-12" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="truncate text-left font-semibold hover:text-primary"
                          onClick={() => navigate(`/app/catechists/${catechist.id}`, { state: detailState })}
                        >
                          {catechist.fullName}
                        </button>
                        <Badge variant={catechist.active ? 'success' : 'outline'} className="shrink-0">{catechist.active ? 'Activo' : 'Inactivo'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">@{catechist.username} • {catechist.groupCount} grupos</p>
                      <p className="text-xs text-muted-foreground">Contacto: {catechist.email || catechist.phone || 'Sin registrar'}</p>
                      <p className="text-xs text-muted-foreground">Grupo principal: {catechist.groupNames[0] || 'Sin asignar'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <SecondaryButton asChild>
                      <Link to={`/app/catechists/${catechist.id}`} state={detailState}>
                        Abrir ficha
                      </Link>
                    </SecondaryButton>
                    <SecondaryButton type="button" size="icon" onClick={() => setActionCatechist(catechist)}>
                      <MoreHorizontal className="size-4" />
                    </SecondaryButton>
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

      <ActionSheet
        open={showFilters}
        onOpenChange={setShowFilters}
        title="Ayuda de uso"
        description="La pantalla ya esta resumida para ubicar rapido al responsable correcto."
      >
        <div className="space-y-3 px-1 pb-1 text-sm text-muted-foreground">
          <p>1. Busca por nombre o usuario.</p>
          <p>2. Abre la ficha para revisar grupos asignados.</p>
          <p>3. Usa el menu de acciones para editar o cambiar el estado.</p>
        </div>
      </ActionSheet>

        <CatechistForm
          open={openForm}
          onOpenChange={setOpenForm}
          catechist={selectedCatechist}
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
          label="Ver catequista"
          icon={UserRound}
          onClick={() => {
            if (!actionCatechist) return
            navigate(`/app/catechists/${actionCatechist.id}`, { state: detailState })
            setActionCatechist(null)
          }}
        />
        <ActionSheetItem
          label="Editar catequista"
          icon={Edit3}
          onClick={() => {
            if (!actionCatechist) return
            openCatechistEditor(actionCatechist)
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
