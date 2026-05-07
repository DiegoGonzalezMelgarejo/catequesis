import { useEffect, useMemo, useState } from 'react'
import { CheckCheck, CircleOff, MessageSquareMore, NotebookPen, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppCard } from '@/components/app/app-card'
import { AppInput } from '@/components/app/app-input'
import { AppSelect } from '@/components/app/app-select'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PaginationControls } from '@/components/app/pagination-controls'
import { PrimaryButton } from '@/components/app/primary-button'
import { SearchInput } from '@/components/app/search-input'
import { SecondaryButton } from '@/components/app/secondary-button'
import { SummaryCard } from '@/components/app/summary-card'
import { useAsyncData } from '@/hooks/use-async-data'
import { Input } from '@/components/ui/input'
import { getAccessibleGroups } from '@/services/access-service'
import { getAttendanceSessionDetail, getStudentsByGroup, saveAttendanceSession } from '@/services/attendance-service'
import type { AttendanceStatus, User } from '@/types/models'
import { formatDate, getTodayInputValue } from '@/utils/date'
import { cn } from '@/utils/cn'

type AttendanceSessionFormProps = {
  user: User
  initialGroupId?: string | null
  initialDate?: string | null
  mode?: 'new' | 'edit'
}

type AttendanceState = Record<string, { status: AttendanceStatus; observations: string }>

const EMPTY_ATTENDANCE_RECORDS = new Map<string, { status: AttendanceStatus; observations?: string }>()
const EMPTY_ATTENDANCE_SESSION = {
  session: null,
  records: EMPTY_ATTENDANCE_RECORDS,
}

const statusMeta: Record<AttendanceStatus, { label: string; className: string }> = {
  PRESENTE: { label: 'Presente', className: 'border-success/20 bg-success/15 text-success' },
  AUSENTE: { label: 'Ausente', className: 'border-destructive/20 bg-destructive/12 text-destructive' },
  JUSTIFICADO: { label: 'Justificado', className: 'border-warning/25 bg-warning/20 text-foreground' },
}

function areAttendanceStatesEqual(left: AttendanceState, right: AttendanceState) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)

  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key) => {
    const leftRecord = left[key]
    const rightRecord = right[key]

    return (
      rightRecord != null &&
      leftRecord.status === rightRecord.status &&
      leftRecord.observations === rightRecord.observations
    )
  })
}

export function AttendanceSessionForm({
  user,
  initialGroupId,
  initialDate,
  mode = 'new',
}: AttendanceSessionFormProps) {
  const navigate = useNavigate()
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId ?? '')
  const [selectedDate, setSelectedDate] = useState(initialDate ?? getTodayInputValue())
  const [records, setRecords] = useState<AttendanceState>({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL')
  const [page, setPage] = useState(1)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedObservationStudentId, setExpandedObservationStudentId] = useState<string | null>(null)

  const { data: groupsData, loading: groupsLoading } = useAsyncData(
    () => getAccessibleGroups(user),
    [user.id, user.role],
  )
  const { data: studentsData, loading: studentsLoading } = useAsyncData(
    async () => {
      if (!selectedGroupId) {
        return []
      }

      const entries = await getStudentsByGroup(selectedGroupId)
      return entries.filter((student) => student.active)
    },
    [selectedGroupId],
  )
  const { data: existingSessionData, loading: sessionLoading } = useAsyncData(
    () =>
      selectedGroupId
        ? getAttendanceSessionDetail(selectedGroupId, selectedDate)
        : Promise.resolve({ session: null, records: new Map() }),
    [selectedGroupId, selectedDate],
  )

  const groups = groupsData ?? []
  const students = studentsData ?? []
  const existingSession = existingSessionData ?? EMPTY_ATTENDANCE_SESSION
  const isEditingSession = Boolean(existingSession.session)
  const isDuplicateNewSession = mode === 'new' && isEditingSession

  useEffect(() => {
    if (!selectedGroupId && groups[0]) {
      setSelectedGroupId(groups[0].id)
    }
  }, [groups, selectedGroupId])

  useEffect(() => {
    setPage(1)
  }, [search, selectedGroupId, selectedDate, statusFilter])

  useEffect(() => {
    setExpandedObservationStudentId(null)
  }, [page, search, selectedDate, selectedGroupId])

  useEffect(() => {
    if (!students.length) {
      setRecords((current) => (Object.keys(current).length === 0 ? current : {}))
      setNotes((current) => (current === '' ? current : ''))
      return
    }

    const nextRecords = Object.fromEntries(
      students.map((student) => {
        const record = existingSession.records.get(student.id)

        return [
          student.id,
          {
            status: record?.status ?? 'PRESENTE',
            observations: record?.observations ?? '',
          },
        ]
      }),
    )

    setRecords((current) => (areAttendanceStatesEqual(current, nextRecords) ? current : nextRecords))
    const nextNotes = existingSession.session?.notes ?? ''
    setNotes((current) => (current === nextNotes ? current : nextNotes))
  }, [existingSession.records, existingSession.session?.notes, students])

  const filteredStudents = useMemo(
    () =>
      students.filter((student) =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, students],
  )

  const visibleStudents = useMemo(
    () =>
      filteredStudents.filter((student) => {
        if (statusFilter === 'ALL') {
          return true
        }

        return (records[student.id]?.status ?? 'PRESENTE') === statusFilter
      }),
    [filteredStudents, records, statusFilter],
  )

  const pagedStudents = useMemo(
    () => visibleStudents.slice((page - 1) * 20, page * 20),
    [page, visibleStudents],
  )

  const stats = useMemo(() => {
    const values = Object.values(records)

    return {
      presentes: values.filter((record) => record.status === 'PRESENTE').length,
      ausentes: values.filter((record) => record.status === 'AUSENTE').length,
      justificados: values.filter((record) => record.status === 'JUSTIFICADO').length,
    }
  }, [records])

  const formattedActionDate = selectedDate
    ? formatDate(selectedDate, 'dd MMM yyyy')
    : 'fecha seleccionada'
  const submitButtonLabel = saving
    ? `${isEditingSession ? 'Actualizando' : 'Guardando'} toma del ${formattedActionDate}`
    : `${isEditingSession ? 'Actualizar' : 'Guardar'} toma del ${formattedActionDate}`

  if (groupsLoading && !groupsData) {
    return <PageSkeleton variant="detail" />
  }

  async function handleSave() {
    if (!selectedGroupId) {
      toast.error('Selecciona un grupo.')
      return
    }

    if (isDuplicateNewSession) {
      toast.error('Esta fecha ya tiene una asistencia registrada. Debes editarla.')
      return
    }

    try {
      setSaving(true)
      await saveAttendanceSession({
        groupId: selectedGroupId,
        date: selectedDate,
        notes,
        createdBy: user.id,
        records: students.map((student) => ({
          studentId: student.id,
          status: records[student.id]?.status ?? 'PRESENTE',
          observations: records[student.id]?.observations,
        })),
      })
      toast.success(existingSession.session ? 'Asistencia actualizada.' : 'Asistencia guardada.')
      navigate(`/app/attendance?groupId=${selectedGroupId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar la asistencia.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <SecondaryButton type="button" onClick={() => navigate(`/app/attendance?groupId=${selectedGroupId}`)}>
          Volver al histórico
        </SecondaryButton>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <AppCard title={mode === 'edit' ? 'Editar toma de asistencia' : 'Nueva toma de asistencia'} description="Selecciona la fecha y registra la asistencia del grupo. Cada fecha guarda su propia toma.">
          <div className="grid gap-4 sm:grid-cols-2">
            <AppSelect
              label="Grupo"
              value={selectedGroupId}
              onValueChange={setSelectedGroupId}
              options={groups.filter((group) => group.active).map((group) => ({ label: group.name, value: group.id }))}
            />
            <AppInput
              label="Fecha"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <div className="sm:col-span-2">
              <AppInput
                label="Observaciones generales"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                hint="Puedes registrar notas generales del encuentro de ese día."
              />
            </div>
          </div>
        </AppCard>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard title="Presentes" value={stats.presentes} icon={CheckCheck} />
          <SummaryCard title="Ausentes" value={stats.ausentes} icon={CircleOff} />
          <SummaryCard title="Justificados" value={stats.justificados} icon={ShieldCheck} />
        </div>
      </div>

      {mode === 'edit' && existingSession.session ? (
        <AppCard
          title="Editando una toma existente"
          description="Los cambios que guardes actualizarán la asistencia registrada para esta fecha."
        >
          <div className="text-sm text-muted-foreground">
            Revisa la fecha, ajusta los estados necesarios y guarda para actualizar el registro.
          </div>
        </AppCard>
      ) : null}

      {isDuplicateNewSession ? (
        <AppCard
          title="Esta fecha ya fue registrada"
          description="No puedes crear una nueva toma para la misma fecha. Debes regresar al histórico y abrir la existente para editarla."
        >
          <div className="flex flex-wrap gap-2">
            <SecondaryButton
              type="button"
              onClick={() => navigate(`/app/attendance?groupId=${selectedGroupId}`)}
            >
              Volver al histórico
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={() => navigate(`/app/attendance/session?groupId=${selectedGroupId}&date=${selectedDate}&mode=edit`)}
            >
              Editar esta toma
            </PrimaryButton>
          </div>
        </AppCard>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar alumno" />
        <div className="flex flex-wrap gap-2">
          <PrimaryButton
            type="button"
            onClick={() =>
              setRecords((current) =>
                Object.fromEntries(
                  Object.keys(current).map((studentId) => [
                    studentId,
                    { ...current[studentId], status: 'PRESENTE' },
                  ]),
                ),
              )
            }
          >
            Marcar todos presentes
          </PrimaryButton>
          <PrimaryButton
            type="button"
            onClick={handleSave}
            disabled={saving || students.length === 0 || isDuplicateNewSession}
          >
            <NotebookPen className="size-4" />
            {submitButtonLabel}
          </PrimaryButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'ALL', label: 'Todos' },
          { key: 'PRESENTE', label: 'Presentes' },
          { key: 'AUSENTE', label: 'Ausentes' },
          { key: 'JUSTIFICADO', label: 'Justificados' },
        ].map((option) => {
          const active = statusFilter === option.key

          return (
            <button
              key={option.key}
              type="button"
              className={cn(
                'rounded-full border px-3 py-2 text-sm font-medium transition',
                active
                  ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
                  : 'border-white/70 bg-white text-muted-foreground hover:bg-secondary/70',
              )}
              onClick={() => setStatusFilter(option.key as 'ALL' | AttendanceStatus)}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {studentsLoading || sessionLoading ? (
        <PageSkeleton variant="detail" />
      ) : students.length === 0 ? (
        <EmptyState
          title="Sin alumnos activos"
          description="Primero registra alumnos activos en el grupo seleccionado."
          icon={CircleOff}
        />
      ) : isDuplicateNewSession ? null : visibleStudents.length === 0 ? (
        <EmptyState
          title="Sin coincidencias"
          description="No hay alumnos para el filtro seleccionado."
          icon={CircleOff}
        />
      ) : (
        <AppCard
          title="Lista del día"
          description="Vista compacta para registrar asistencia de grupos grandes con menos desplazamiento."
        >
          <div className="space-y-2">
            {pagedStudents.map((student) => {
              const currentStatus = records[student.id]?.status ?? 'PRESENTE'
              const hasObservation = Boolean(records[student.id]?.observations)
              const observationExpanded = expandedObservationStudentId === student.id

              return (
                <div
                  key={student.id}
                  className={cn(
                    'rounded-[1.25rem] border p-3 transition',
                    currentStatus === 'PRESENTE' && 'border-success/20 bg-success/5',
                    currentStatus === 'AUSENTE' && 'border-destructive/20 bg-destructive/5',
                    currentStatus === 'JUSTIFICADO' && 'border-warning/25 bg-warning/10',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-muted-foreground">Registro individual de esta fecha</p>
                    </div>
                    <Badge className={cn('border shrink-0', statusMeta[currentStatus].className)}>
                      {statusMeta[currentStatus].label}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(['PRESENTE', 'AUSENTE', 'JUSTIFICADO'] as AttendanceStatus[]).map((status) => {
                      const active = currentStatus === status

                      return (
                        <button
                          key={status}
                          type="button"
                          className={cn(
                            'rounded-xl border px-2 py-2 text-xs font-medium transition shadow-sm sm:text-sm',
                            active
                              ? statusMeta[status].className
                              : 'border-white/70 bg-white text-foreground hover:bg-secondary/60',
                          )}
                          onClick={() =>
                            setRecords((current) => ({
                              ...current,
                              [student.id]: {
                                status,
                                observations: current[student.id]?.observations ?? '',
                              },
                            }))
                          }
                        >
                          {statusMeta[status].label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <SecondaryButton
                      type="button"
                      size="sm"
                      onClick={() =>
                        setExpandedObservationStudentId((current) =>
                          current === student.id ? null : student.id,
                        )
                      }
                    >
                      <MessageSquareMore className="size-4" />
                      {observationExpanded ? 'Ocultar observación' : 'Observación'}
                    </SecondaryButton>
                    <span className="text-xs text-muted-foreground">
                      {hasObservation ? 'Con observación' : 'Sin observación'}
                    </span>
                  </div>

                  {observationExpanded ? (
                    <Input
                      className="mt-3 h-10"
                      placeholder="Escribe una observación para este estudiante"
                      value={records[student.id]?.observations ?? ''}
                      onChange={(event) =>
                        setRecords((current) => ({
                          ...current,
                          [student.id]: {
                            status: current[student.id]?.status ?? 'PRESENTE',
                            observations: event.target.value,
                          },
                        }))
                      }
                    />
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="mt-4">
            <PaginationControls
              page={page}
              pageSize={20}
              hasNext={page * 20 < visibleStudents.length}
              hasPrevious={page > 1}
              label="Alumnos de la toma"
              onNext={() => setPage((current) => current + 1)}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            />
          </div>
        </AppCard>
      )}
    </div>
  )
}
