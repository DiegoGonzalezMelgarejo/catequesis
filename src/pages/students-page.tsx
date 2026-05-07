import { useCallback, useMemo, useState } from 'react'
import { BookUser, ChevronRight, Edit3, Eye, UserRound, UserRoundX } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/app/tabs'
import { listDocuments } from '@/database/firestore-repository'
import { StudentForm, type EditableStudent } from '@/features/students/student-form'
import { useAsyncData } from '@/hooks/use-async-data'
import { usePaginatedResource } from '@/hooks/use-paginated-resource'
import { useAuth } from '@/hooks/use-auth'
import { getAlertItems } from '@/services/alert-service'
import { getAccessibleGroups } from '@/services/access-service'
import { getStudentsPage, setStudentActive } from '@/services/student-service'

export function StudentsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<EditableStudent | null>(null)
  const [confirmState, setConfirmState] = useState<{ id: string; active: boolean; name: string } | null>(null)

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar alumno" />
          <select className="h-11 rounded-xl border border-input bg-white px-4 text-sm" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            <option value="">Todos los grupos</option>
            {data.groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {user.role === 'ADMIN' ? (
          <PrimaryButton type="button" onClick={() => { setSelectedStudent(null); setOpenForm(true) }}>
            Registrar alumno
          </PrimaryButton>
        ) : null}
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Listado</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          {filteredStudents.length === 0 ? (
            <EmptyState title="Sin alumnos" description="No hay alumnos para el filtro actual." icon={BookUser} />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredStudents.map((student) => {
                const editableGuardians = data.guardians
                  .filter((guardian) => guardian.studentId === student.id)
                  .map((guardian) => ({
                    name: guardian.name,
                    relationship: guardian.relationship,
                    phone: guardian.phone,
                    whatsapp: guardian.whatsapp,
                    email: guardian.email,
                    isPrimary: guardian.isPrimary,
                  }))
                const editableSacraments = data.studentSacraments
                  .filter((record) => record.studentId === student.id)
                  .map((record) => record.sacramentId)

                return (
                  <AppCard key={student.id} interactive>
                    <div className="space-y-4">
                      <Link
                        to={`/app/students/${student.id}`}
                        className="flex items-start gap-4 rounded-[1.5rem] bg-gradient-to-br from-primary/6 via-white to-cyan-400/5 p-4 transition hover:bg-primary/5"
                      >
                        <EntityAvatar icon={UserRound} label={student.fullName} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-foreground">{student.fullName}</p>
                              <p className="text-sm text-muted-foreground">{student.groupName} • {student.age} años</p>
                            </div>
                            <Badge variant={student.active ? 'success' : 'outline'}>
                              {student.active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">
                            Toca la card para ver historial, asistencia, notas y acudientes.
                          </p>
                        </div>
                        <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
                      </Link>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                          <p className="text-muted-foreground">Acudientes</p>
                          <p className="mt-1 font-medium">{student.guardianCount}</p>
                        </div>
                        <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                          <p className="text-muted-foreground">Sacramentos</p>
                          <p className="mt-1 font-medium">{student.sacramentCount}</p>
                        </div>
                        <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                          <p className="text-muted-foreground">Observacion</p>
                          <p className="mt-1 font-medium">{student.observations || 'Sin notas'}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <SecondaryButton asChild>
                          <Link to={`/app/students/${student.id}`}>
                            <Eye className="size-4" />
                            Historial
                          </Link>
                        </SecondaryButton>

                        {user.role === 'ADMIN' ? (
                          <>
                            <SecondaryButton
                              type="button"
                              onClick={() => {
                                setSelectedStudent({
                                  id: student.id,
                                  firstName: student.firstName,
                                  lastName: student.lastName,
                                  birthDate: student.birthDate,
                                  groupId: student.groupId,
                                  observations: student.observations,
                                  guardians: editableGuardians,
                                  sacramentIds: editableSacraments,
                                })
                                setOpenForm(true)
                              }}
                            >
                              <Edit3 className="size-4" />
                              Editar
                            </SecondaryButton>
                            <SecondaryButton
                              type="button"
                              onClick={() => setConfirmState({ id: student.id, active: student.active, name: student.fullName })}
                            >
                              <UserRoundX className="size-4" />
                              {student.active ? 'Inactivar' : 'Reactivar'}
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
                label="Alumnos"
                onNext={goNext}
                onPrevious={goPrevious}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          {studentAlerts.length === 0 ? (
            <EmptyState title="Sin alertas" description="No hay alertas relacionadas con alumnos o grupos." icon={BookUser} />
          ) : (
            <div className="space-y-3">
              {studentAlerts.map((alert) => (
                <AppCard key={alert.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                    <Badge variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'warning' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </div>
                </AppCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
    </div>
  )
}
