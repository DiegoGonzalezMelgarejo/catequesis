import { useCallback, useEffect, useState } from 'react'
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
import { ViewModeToggle, type ViewMode } from '@/components/app/view-mode-toggle'
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
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') {
      return 'list'
    }

    return (window.localStorage.getItem('catechists-view-mode') as ViewMode | null) ?? 'list'
  })

  useEffect(() => {
    window.localStorage.setItem('catechists-view-mode', viewMode)
  }, [viewMode])

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
          <div className="hidden sm:block">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
          <SecondaryButton className="sm:hidden" type="button" onClick={() => setShowFilters(true)}>
            <ListFilter className="size-4" />
            Vista
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

      {filteredCatechists.length === 0 ? (
        <EmptyState title="Sin catequistas" description="Crea el primer catequista para asignar grupos." icon={UserPlus} />
      ) : (
        <>
          {viewMode === 'cards' ? (
            <div className="space-y-3">
              {filteredCatechists.map((catechist) => {
                return (
                  <AppCard key={catechist.id} interactive>
                    <div className="space-y-3">
                      <Link
                        to={`/app/catechists/${catechist.id}`}
                        state={detailState}
                        className="flex w-full items-center gap-3 rounded-[0.95rem] bg-secondary/35 p-3 text-left transition hover:bg-secondary/55"
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
                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <Badge variant={catechist.active ? 'success' : 'outline'} className="sm:hidden">
                              {catechist.active ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <span>{catechist.groupCount} grupos</span>
                            <span>{catechist.email || catechist.phone || 'Sin contacto'}</span>
                          </div>
                        </div>
                      </Link>

                    <div className="rounded-[0.95rem] bg-secondary/45 px-3 py-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Grupo principal:</span>{' '}
                        {catechist.groupNames[0] || 'Sin asignar'}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">{catechist.groupCount} grupos asignados</p>
                        <div className="flex items-center gap-2">
                          <SecondaryButton asChild>
                            <Link to={`/app/catechists/${catechist.id}`} state={detailState}>
                              Abrir
                            </Link>
                          </SecondaryButton>
                          <SecondaryButton type="button" size="icon" onClick={() => setActionCatechist(catechist)}>
                            <MoreHorizontal className="size-4" />
                          </SecondaryButton>
                        </div>
                      </div>
                    </div>
                  </AppCard>
                )
              })}
            </div>
          ) : null}

          {viewMode === 'list' ? (
            <AppCard title="Listado de catequistas" description="Vista simple para ubicar un catequista y abrir su ficha.">
              <div className="divide-y divide-border/70">
                {filteredCatechists.map((catechist) => (
                  <div key={catechist.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <EntityAvatar icon={UserRound} label={catechist.fullName} className="size-12" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="truncate font-semibold">{catechist.fullName}</p>
                          <Badge variant={catechist.active ? 'success' : 'outline'} className="shrink-0">{catechist.active ? 'Activo' : 'Inactivo'}</Badge>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          @{catechist.username} • {catechist.groupCount} grupos
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Contacto: {catechist.email || catechist.phone || 'Sin registrar'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <SecondaryButton asChild>
                        <Link to={`/app/catechists/${catechist.id}`} state={detailState}>
                          Abrir
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
          ) : null}

          {viewMode === 'table' ? (
            <AppCard>
              <div className="no-scrollbar overflow-x-auto">
                <table className="min-w-[44rem] w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-muted-foreground">
                      <th className="px-3 py-3 font-medium">Catequista</th>
                      <th className="px-3 py-3 font-medium">Usuario</th>
                      <th className="px-3 py-3 font-medium">Contacto</th>
                      <th className="px-3 py-3 font-medium">Grupos</th>
                      <th className="px-3 py-3 font-medium">Estado</th>
                      <th className="px-3 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCatechists.map((catechist) => (
                      <tr key={catechist.id} className="border-b border-border/40">
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            className="font-medium text-left hover:text-primary"
                            onClick={() => navigate(`/app/catechists/${catechist.id}`, { state: detailState })}
                          >
                            {catechist.fullName}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">@{catechist.username}</td>
                        <td className="px-3 py-3 text-muted-foreground">{catechist.email || catechist.phone || 'Sin contacto'}</td>
                        <td className="px-3 py-3">{catechist.groupCount}</td>
                        <td className="px-3 py-3">
                          <Badge variant={catechist.active ? 'success' : 'outline'}>{catechist.active ? 'Activo' : 'Inactivo'}</Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <SecondaryButton type="button" size="icon" onClick={() => setActionCatechist(catechist)}>
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
        title="Vista del listado"
        description="Elige cómo revisar la lista de catequistas."
      >
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
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
