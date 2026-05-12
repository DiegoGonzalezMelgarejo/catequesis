import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, BookUser, Download, Edit3, Eye, ListFilter, MoreHorizontal, UserRound, UserRoundX } from 'lucide-react'
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
import { StudentForm, type EditableStudent } from '@/features/students/student-form'
import { useActiveYear } from '@/hooks/use-active-year'
import { useAsyncData } from '@/hooks/use-async-data'
import { usePaginatedResource } from '@/hooks/use-paginated-resource'
import { useAuth } from '@/hooks/use-auth'
import { getAlertItems } from '@/services/alert-service'
import { getAccessibleGroups } from '@/services/access-service'
import { getStudentsPage, setStudentActive } from '@/services/student-service'
import { exportStudentFormPdf } from '@/utils/student-form-pdf'
import { formatYearLabel } from '@/utils/year'

export function StudentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { activeYear } = useActiveYear()
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<EditableStudent | null>(null)
  const [confirmState, setConfirmState] = useState<{ id: string; active: boolean; name: string } | null>(null)
  const [actionStudent, setActionStudent] = useState<Awaited<ReturnType<typeof getStudentsPage>>['items'][number] | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const fetchPage = useCallback(
    (cursor: Parameters<typeof getStudentsPage>[1], pageSize: number) => {
      if (!user) {
        return Promise.resolve({ items: [], nextCursor: null, hasMore: false })
      }

      return getStudentsPage(user, cursor, pageSize, groupFilter || undefined, activeYear ?? undefined, search)
    },
    [groupFilter, search, user, activeYear],
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
        getAccessibleGroups(user, activeYear ?? undefined),
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
        getAlertItems(user, activeYear ?? undefined),
      ])

      return { groups, sacraments, guardians, studentSacraments, alerts }
    },
    [user?.id, user?.role, activeYear],
  )

  const filteredStudents = useMemo(
    () =>
      pagedStudents.filter((student) =>
        `${student.fullName} ${student.groupName}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [pagedStudents, search],
  )

  if (!user || !activeYear || loading || pageLoading || !data) {
    return <PageSkeleton variant="list" />
  }

  const detailState = { from: location.pathname + location.search, label: 'Volver a alumnos' }
  const primaryGuardianByStudent = new Map(
    data.guardians
      .filter((guardian) => guardian.isPrimary)
      .map((guardian) => [guardian.studentId, guardian]),
  )

  const studentAlerts = data.alerts.filter((alert) => alert.studentId || alert.groupId)
  const activeStudents = filteredStudents.filter((student) => student.active).length
  const studentsWithPendingDocuments = filteredStudents.filter((student) => student.documentProgressPercent < 100).length
  const studentsWithPendingChecklist = filteredStudents.filter((student) => student.checklistProgressPercent < 100).length

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
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_14rem] sm:items-center xl:flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar alumno" />
          <select className="hidden h-11 rounded-[0.875rem] border border-input bg-white px-4 text-sm sm:block" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            <option value="">Todos los grupos</option>
            {data.groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} · {group.year}
              </option>
              ))}
          </select>
          <div className="hidden h-11 items-center rounded-[0.875rem] border border-input bg-white px-4 text-sm text-muted-foreground sm:flex">{formatYearLabel(activeYear)}</div>
          <SecondaryButton className="sm:hidden" type="button" onClick={() => setShowFilters(true)}>
            <ListFilter className="size-4" />
            Filtros
          </SecondaryButton>
        </div>

        {user.role === 'ADMIN' ? (
          <div className="hidden xl:flex items-center gap-2">
            <SecondaryButton type="button" onClick={() => exportStudentFormPdf(activeYear ?? undefined)}>
              <Download className="size-4" />
              Formulario PDF
            </SecondaryButton>
            <PrimaryButton className="hidden xl:inline-flex" type="button" onClick={() => { setSelectedStudent(null); setOpenForm(true) }}>
              Registrar alumno
            </PrimaryButton>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{activeStudents}</p>
          </div>
        </AppCard>
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Pendientes de documentos</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{studentsWithPendingDocuments}</p>
          </div>
        </AppCard>
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Pendientes de checklist</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{studentsWithPendingChecklist}</p>
          </div>
        </AppCard>
      </div>

      {filteredStudents.length === 0 ? (
        <EmptyState title="Sin alumnos" description="Ajusta la busqueda o el grupo para encontrar alumnos, o registra uno nuevo si hace falta." icon={BookUser} />
      ) : (
        <div className="space-y-4">
          <AppCard title="Listado de alumnos" description="Encuentra rapido la ficha, el acudiente principal y el avance del seguimiento.">
            <div className="divide-y divide-border/70">
              {filteredStudents.map((student) => (
                <div key={student.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <EntityAvatar icon={UserRound} label={student.fullName} className="size-12" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className="truncate text-left font-semibold hover:text-primary" onClick={() => navigate(`/app/students/${student.id}`, { state: detailState })}>
                          {student.fullName}
                        </button>
                        <Badge variant={student.active ? 'success' : 'outline'} className="shrink-0">{student.active ? 'Activo' : 'Inactivo'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{student.groupName} • {formatYearLabel(student.year)}{student.age != null ? ` • ${student.age} años` : ''}</p>
                      <p className="text-xs text-muted-foreground">Acudiente principal: {primaryGuardianByStudent.get(student.id)?.name ?? 'Sin registrar'}</p>
                      <div className="grid gap-2 sm:max-w-md sm:grid-cols-2">
                        <div className="rounded-[0.95rem] bg-secondary/35 px-3 py-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-muted-foreground">Checklist</span>
                            <span className="text-muted-foreground">{student.checklistProgressPercent}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${student.checklistProgressPercent}%` }} />
                          </div>
                        </div>
                        <div className="rounded-[0.95rem] bg-secondary/35 px-3 py-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-muted-foreground">Documentos</span>
                            <span className="text-muted-foreground">{student.documentProgressPercent}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${student.documentProgressPercent}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <SecondaryButton asChild>
                      <Link to={`/app/students/${student.id}`} state={detailState}>
                        Abrir ficha
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

          <PaginationControls
            page={page}
            pageSize={pageSize}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
            label="Alumnos"
            onNext={goNext}
            onPrevious={goPrevious}
          />

          {studentAlerts.length > 0 ? (
            <AppCard title="Alertas relacionadas" description="Casos que conviene revisar después de revisar el listado.">
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
        </div>
      )}

      {user.role === 'ADMIN' ? (
        <MobilePageActionBar>
          <div className="flex w-full gap-2">
            <SecondaryButton className="flex-1" type="button" onClick={() => exportStudentFormPdf(activeYear ?? undefined)}>
              <Download className="size-4" />
              Formulario PDF
            </SecondaryButton>
            <PrimaryButton className="flex-1" type="button" onClick={() => { setSelectedStudent(null); setOpenForm(true) }}>
              Registrar alumno
            </PrimaryButton>
          </div>
        </MobilePageActionBar>
      ) : null}

      {user.role === 'ADMIN' ? (
        <StudentForm
          open={openForm}
          onOpenChange={setOpenForm}
          student={selectedStudent}
          groups={data.groups.filter((group) => group.active).map((group) => ({ label: `${group.name} · ${group.year}`, value: group.id, description: formatYearLabel(group.year) }))}
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
                  {group.name} · {group.year}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Año activo</label>
            <div className="rounded-[0.95rem] bg-secondary/35 px-3 py-3 text-sm text-muted-foreground">
              {formatYearLabel(activeYear)}
            </div>
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
