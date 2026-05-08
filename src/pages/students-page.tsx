import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BookUser, Edit3, Eye, ListFilter, MoreHorizontal, UserRound, UserRoundX } from 'lucide-react'
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
import { StudentForm, type EditableStudent } from '@/features/students/student-form'
import { useAsyncData } from '@/hooks/use-async-data'
import { usePaginatedResource } from '@/hooks/use-paginated-resource'
import { useAuth } from '@/hooks/use-auth'
import { getAlertItems } from '@/services/alert-service'
import { getAccessibleGroups } from '@/services/access-service'
import { getStudentsPage, setStudentActive } from '@/services/student-service'

export function StudentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<EditableStudent | null>(null)
  const [confirmState, setConfirmState] = useState<{ id: string; active: boolean; name: string } | null>(null)
  const [actionStudent, setActionStudent] = useState<Awaited<ReturnType<typeof getStudentsPage>>['items'][number] | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') {
      return 'list'
    }

    return (window.localStorage.getItem('students-view-mode') as ViewMode | null) ?? 'list'
  })

  useEffect(() => {
    window.localStorage.setItem('students-view-mode', viewMode)
  }, [viewMode])

  const fetchPage = useCallback(
    (cursor: Parameters<typeof getStudentsPage>[1], pageSize: number) => {
      if (!user) {
        return Promise.resolve({ items: [], nextCursor: null, hasMore: false })
      }

      return getStudentsPage(user, cursor, pageSize, groupFilter || undefined, search)
    },
    [groupFilter, search, user],
  )
  const {
    items: pagedStudents,
    loading: pageLoading,
    page,
    pageSize,
    hasNext,
    hasPrevious,
    goNext,
    goPrevious,
  } = usePaginatedResource<Awaited<ReturnType<typeof getStudentsPage>>['items'][number], Parameters<typeof getStudentsPage>[1]>({
    pageSize: 20,
    deps: [user?.id, user?.role, groupFilter, search],
    fetchPage,
  })

  const { data, loading } = useAsyncData(
    async () => {
      if (!user) {
        return null
      }

      const [groups, sacraments, guardians, studentSacraments, alerts] = await Promise.all([
        getAccessibleGroups(user),
        listDocuments<{ id: string; name: string; active: boolean }>('sacraments'),
        listDocuments<{
          id: string
          studentId: string
          name: string
          relationship: string
          phone?: string
          whatsapp?: string
          email?: string
          isPrimary: boolean
        }>('guardians'),
        listDocuments<{ id: string; studentId: string; sacramentId: string }>('studentSacraments'),
        getAlertItems(user),
      ])

      return { groups, sacraments, guardians, studentSacraments, alerts }
    },
    [user?.id, user?.role],
  )

  const filteredStudents = useMemo(
    () =>
      pagedStudents.filter((student) =>
        `${student.fullName} ${student.groupName}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [pagedStudents, search],
  )

  if (!user || loading || pageLoading || !data) {
    return <PageSkeleton variant="list" />
  }

  const detailState = { from: location.pathname + location.search, label: 'Volver a alumnos' }
  const primaryGuardianByStudent = new Map(
    data.guardians
      .filter((guardian) => guardian.isPrimary)
      .map((guardian) => [guardian.studentId, guardian]),
  )

  const studentAlerts = data.alerts.filter((alert) => alert.studentId || alert.groupId)

  async function handleToggleStudent() {
    if (!confirmState) {
      return
    }

    try {
      await setStudentActive(confirmState.id, !confirmState.active)
      toast.success(confirmState.active ? 'Alumno inactivado.' : 'Alumno reactivado.')
      setConfirmState(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible actualizar el alumno.')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem] lg:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-center xl:flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar alumno" />
          <select className="hidden h-11 rounded-[0.875rem] border border-input bg-white px-4 text-sm sm:block" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            <option value="">Todos los grupos</option>
            {data.groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
              ))}
          </select>
          <div className="hidden sm:col-span-2 lg:col-span-1 sm:block">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
          <SecondaryButton className="sm:hidden" type="button" onClick={() => setShowFilters(true)}>
            <ListFilter className="size-4" />
            Filtros
          </SecondaryButton>
        </div>

        {user.role === 'ADMIN' ? (
          <PrimaryButton className="hidden xl:inline-flex" type="button" onClick={() => { setSelectedStudent(null); setOpenForm(true) }}>
            Registrar alumno
          </PrimaryButton>
        ) : null}
      </div>

      {studentAlerts.length > 0 ? (
        <AppCard title="Alertas relacionadas" description="Casos que conviene revisar antes de editar el listado.">
          <div className="flex items-center justify-between gap-3 rounded-[0.95rem] bg-warning/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="rounded-[0.8rem] bg-warning/20 p-2 text-foreground">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <p className="font-medium">{studentAlerts.length} alertas en alumnos o grupos</p>
                <p className="text-sm text-muted-foreground">Abre el centro de alertas para ver prioridad y seguimiento.</p>
              </div>
            </div>
            <SecondaryButton type="button" onClick={() => navigate('/app/alerts')}>
              Ver alertas
            </SecondaryButton>
          </div>
        </AppCard>
      ) : null}

      {filteredStudents.length === 0 ? (
        <EmptyState title="Sin alumnos" description="No hay alumnos para el filtro actual." icon={BookUser} />
      ) : (
        <div className="space-y-4">
          {viewMode === 'cards' ? (
            <div className="space-y-3">
              {filteredStudents.map((student) => (
                <AppCard key={student.id} interactive>
                  <div className="space-y-3">
                    <Link
                      to={`/app/students/${student.id}`}
                      state={detailState}
                      className="flex items-center gap-3 rounded-[0.95rem] bg-secondary/35 p-3 transition hover:bg-secondary/55"
                    >
                      <EntityAvatar icon={UserRound} label={student.fullName} className="size-14 sm:size-16" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-foreground sm:text-lg">{student.fullName}</p>
                            <p className="text-xs text-muted-foreground sm:text-sm">{student.groupName} • {student.age} años</p>
                          </div>
                          <Badge variant={student.active ? 'success' : 'outline'} className="hidden sm:inline-flex">
                            {student.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <Badge variant={student.active ? 'success' : 'outline'} className="sm:hidden">
                            {student.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                          <span>{student.groupName}</span>
                          <span>{student.age} años</span>
                        </div>
                      </div>
                    </Link>

                    <div className="rounded-[0.95rem] bg-secondary/45 px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Acudiente principal:</span>{' '}
                      {primaryGuardianByStudent.get(student.id)?.name ?? 'Sin registrar'}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        {student.sacramentCount} sacramentos • {student.guardianCount} acudientes
                      </p>
                      <div className="flex items-center gap-2">
                        <SecondaryButton asChild>
                          <Link to={`/app/students/${student.id}`} state={detailState}>
                            Abrir
                          </Link>
                        </SecondaryButton>
                        <SecondaryButton type="button" size="icon" onClick={() => setActionStudent(student)}>
                          <MoreHorizontal className="size-4" />
                        </SecondaryButton>
                      </div>
                    </div>
                  </div>
                </AppCard>
              ))}
            </div>
          ) : null}

          {viewMode === 'list' ? (
            <AppCard title="Listado de alumnos" description="Vista simple para encontrar un alumno y abrir su ficha.">
              <div className="divide-y divide-border/70">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <EntityAvatar icon={UserRound} label={student.fullName} className="size-12" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="truncate font-semibold">{student.fullName}</p>
                          <Badge variant={student.active ? 'success' : 'outline'} className="shrink-0">{student.active ? 'Activo' : 'Inactivo'}</Badge>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {student.groupName} • {student.age} años
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Acudiente: {primaryGuardianByStudent.get(student.id)?.name ?? 'Sin registrar'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <SecondaryButton asChild>
                        <Link to={`/app/students/${student.id}`} state={detailState}>
                          Abrir
                        </Link>
                      </SecondaryButton>
                      <SecondaryButton type="button" size="icon" onClick={() => setActionStudent(student)}>
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
                <table className="min-w-[48rem] w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-muted-foreground">
                      <th className="px-3 py-3 font-medium">Alumno</th>
                      <th className="px-3 py-3 font-medium">Grupo</th>
                      <th className="px-3 py-3 font-medium">Edad</th>
                      <th className="px-3 py-3 font-medium">Acudientes</th>
                      <th className="px-3 py-3 font-medium">Sacramentos</th>
                      <th className="px-3 py-3 font-medium">Estado</th>
                      <th className="px-3 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b border-border/40">
                        <td className="px-3 py-3">
                          <button type="button" className="font-medium text-left hover:text-primary" onClick={() => navigate(`/app/students/${student.id}`, { state: detailState })}>
                            {student.fullName}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{student.groupName}</td>
                        <td className="px-3 py-3">{student.age}</td>
                        <td className="px-3 py-3">{student.guardianCount}</td>
                        <td className="px-3 py-3">{student.sacramentCount}</td>
                        <td className="px-3 py-3">
                          <Badge variant={student.active ? 'success' : 'outline'}>{student.active ? 'Activo' : 'Inactivo'}</Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <SecondaryButton type="button" size="icon" onClick={() => setActionStudent(student)}>
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
            label="Alumnos"
            onNext={goNext}
            onPrevious={goPrevious}
          />
        </div>
      )}

      {user.role === 'ADMIN' ? (
        <MobilePageActionBar>
          <PrimaryButton className="w-full" type="button" onClick={() => { setSelectedStudent(null); setOpenForm(true) }}>
            Registrar alumno
          </PrimaryButton>
        </MobilePageActionBar>
      ) : null}

      {user.role === 'ADMIN' ? (
        <StudentForm
          open={openForm}
          onOpenChange={setOpenForm}
          student={selectedStudent}
          groups={data.groups.filter((group) => group.active).map((group) => ({ label: group.name, value: group.id }))}
          sacraments={data.sacraments.filter((sacrament) => sacrament.active).map((sacrament) => ({ label: sacrament.name, value: sacrament.id }))}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmState(null)
          }
        }}
        title={confirmState?.active ? 'Inactivar alumno' : 'Reactivar alumno'}
        description={
          confirmState
            ? `${confirmState.active ? 'El alumno quedara oculto en la toma de asistencia' : 'El alumno volvera a estar disponible'}: ${confirmState.name}.`
            : ''
        }
        confirmLabel={confirmState?.active ? 'Inactivar' : 'Reactivar'}
        onConfirm={handleToggleStudent}
      />

      <ActionSheet
        open={showFilters}
        onOpenChange={setShowFilters}
        title="Filtros del listado"
        description="Ajusta el grupo y la vista para revisar mejor a tus alumnos."
      >
        <div className="space-y-4 px-1 pb-1">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Grupo</label>
            <select className="h-11 w-full rounded-[0.875rem] border border-input bg-white px-4 text-sm" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
              <option value="">Todos los grupos</option>
              {data.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Vista</label>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </ActionSheet>

      <ActionSheet
        open={Boolean(actionStudent)}
        onOpenChange={(open) => {
          if (!open) {
            setActionStudent(null)
          }
        }}
        title={actionStudent?.fullName ?? 'Acciones del alumno'}
        description="Selecciona la acción que deseas realizar."
      >
        <ActionSheetItem
          label="Ver historial"
          icon={Eye}
          onClick={() => {
            if (!actionStudent) return
            navigate(`/app/students/${actionStudent.id}`, { state: detailState })
          }}
        />
        {user.role === 'ADMIN' ? (
          <>
            <ActionSheetItem
              label="Editar alumno"
              icon={Edit3}
              onClick={() => {
                if (!actionStudent) return
                const editableGuardians = data.guardians
                  .filter((guardian) => guardian.studentId === actionStudent.id)
                  .map((guardian) => ({
                    name: guardian.name,
                    relationship: guardian.relationship,
                    phone: guardian.phone,
                    whatsapp: guardian.whatsapp,
                    email: guardian.email,
                    isPrimary: guardian.isPrimary,
                  }))
                const editableSacraments = data.studentSacraments
                  .filter((record) => record.studentId === actionStudent.id)
                  .map((record) => record.sacramentId)
                setSelectedStudent({
                  id: actionStudent.id,
                  firstName: actionStudent.firstName,
                  lastName: actionStudent.lastName,
                  birthDate: actionStudent.birthDate,
                  groupId: actionStudent.groupId,
                  observations: actionStudent.observations,
                  guardians: editableGuardians,
                  sacramentIds: editableSacraments,
                })
                setOpenForm(true)
                setActionStudent(null)
              }}
            />
            <ActionSheetItem
              label={actionStudent?.active ? 'Inactivar alumno' : 'Reactivar alumno'}
              icon={UserRoundX}
              tone={actionStudent?.active ? 'destructive' : 'default'}
              onClick={() => {
                if (!actionStudent) return
                setConfirmState({ id: actionStudent.id, active: actionStudent.active, name: actionStudent.fullName })
                setActionStudent(null)
              }}
            />
          </>
        ) : null}
      </ActionSheet>
    </div>
  )
}
