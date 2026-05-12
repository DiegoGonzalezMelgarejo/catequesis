import { useEffect, useMemo, useState } from 'react'
import {
  BookUser,
  CalendarDays,
  ClipboardCheck,
  Download,
  Layers3,
  NotebookPen,
  Printer,
  UserRound,
  Users,
} from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { EntityAvatar } from '@/components/app/entity-avatar'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PaginationControls } from '@/components/app/pagination-controls'
import { SearchInput } from '@/components/app/search-input'
import { SecondaryButton } from '@/components/app/secondary-button'
import { SummaryCard } from '@/components/app/summary-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/app/tabs'
import { useAsyncData } from '@/hooks/use-async-data'
import { useAuth } from '@/hooks/use-auth'
import { useBackNavigation } from '@/hooks/use-back-navigation'
import { getGroupDetail } from '@/services/group-service'
import type { AttendanceStatus } from '@/types/models'
import { exportCsvFile } from '@/utils/csv'
import { formatDate } from '@/utils/date'
import {
  exportAttendanceMatrixPdf,
  exportGradesMatrixPdf,
  exportGroupReportPdf,
  printGroupReport,
} from '@/utils/group-report'
import { formatYearLabel } from '@/utils/year'

export function GroupDetailPage() {
  const { user } = useAuth()
  const { groupId } = useParams()
  const location = useLocation()
  const { backLabel, backTo } = useBackNavigation('/app/groups', 'Volver a grupos')
  const detailState = { from: location.pathname + location.search, label: 'Volver al grupo' }
  const [studentSearch, setStudentSearch] = useState('')
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL')
  const [studentPage, setStudentPage] = useState(1)
  const [attendancePage, setAttendancePage] = useState(1)
  const [gradesScope, setGradesScope] = useState<'recent' | 'all'>('recent')
  const [attendanceScope, setAttendanceScope] = useState<'recent' | 'all'>('recent')
  const { data: detail, loading } = useAsyncData(
    () => (user && groupId ? getGroupDetail(user, groupId) : Promise.resolve(null)),
    [groupId, user?.id, user?.role],
  )

  const filteredStudents = useMemo(() => {
    if (!detail) {
      return []
    }

    return detail.students.filter((student) =>
      `${student.fullName} ${student.primaryGuardianName ?? ''} ${student.observations ?? ''}`
        .toLowerCase()
        .includes(studentSearch.toLowerCase()),
    )
  }, [detail, studentSearch])
  const pagedStudents = useMemo(
    () => filteredStudents.slice((studentPage - 1) * 20, studentPage * 20),
    [filteredStudents, studentPage],
  )

  const filteredAttendanceSessions = useMemo(() => {
    if (!detail) {
      return []
    }

    type AttendanceSessionView = (typeof detail.attendanceSessions)[number]

    return detail.attendanceSessions
      .map((session) => {
        const statusFilteredRecords = session.records.filter((record) =>
          attendanceStatusFilter === 'ALL' ? true : record.status === attendanceStatusFilter,
        )

        if (!attendanceSearch.trim()) {
          if (attendanceStatusFilter !== 'ALL' && statusFilteredRecords.length === 0) {
            return null
          }

          return {
            ...session,
            records: statusFilteredRecords,
          }
        }

        const searchValue = attendanceSearch.toLowerCase()
        const sessionMatches = `${session.date} ${session.notes ?? ''}`.toLowerCase().includes(searchValue)
        const searchedRecords = statusFilteredRecords.filter((record) =>
          `${record.studentName} ${record.status} ${record.observations ?? ''}`
            .toLowerCase()
            .includes(searchValue),
        )
        const finalRecords = sessionMatches ? statusFilteredRecords : searchedRecords

        if (finalRecords.length === 0) {
          return null
        }

        return {
          ...session,
          records: finalRecords,
        }
      })
      .filter((session): session is AttendanceSessionView => session !== null)
  }, [attendanceSearch, attendanceStatusFilter, detail])
  const pagedAttendanceSessions = useMemo(
    () => filteredAttendanceSessions.slice((attendancePage - 1) * 20, attendancePage * 20),
    [attendancePage, filteredAttendanceSessions],
  )
  const visibleActivities = useMemo(
    () => (detail ? (gradesScope === 'all' ? detail.allActivities : detail.recentActivities) : []),
    [detail, gradesScope],
  )
  const visibleAttendanceSessions = useMemo(
    () => (detail ? (attendanceScope === 'all' ? detail.attendanceSessions : detail.attendanceSessions.slice(0, 5)) : []),
    [attendanceScope, detail],
  )
  const visibleAttendanceDates = useMemo(
    () => new Set(visibleAttendanceSessions.map((session) => session.date)),
    [visibleAttendanceSessions],
  )
  const visibleAttendanceMatrix = useMemo(
    () =>
      detail
        ? detail.attendanceMatrix.map((row) => ({
            ...row,
            entries: row.entries.filter((entry) => visibleAttendanceDates.has(entry.date)),
          }))
        : [],
    [detail, visibleAttendanceDates],
  )

  useEffect(() => {
    setStudentPage(1)
  }, [studentSearch])

  useEffect(() => {
    setAttendancePage(1)
  }, [attendanceSearch, attendanceStatusFilter])

  if (!user) {
    return null
  }

  if (loading) {
    return <PageSkeleton variant="detail" />
  }

  if (!detail) {
    return (
      <EmptyState
        title="Grupo no disponible"
        description="No encontramos el grupo o no tienes permisos para verlo."
        icon={Layers3}
        action={
          <SecondaryButton asChild>
            <Link to="/app/groups">Volver a grupos</Link>
          </SecondaryButton>
        }
      />
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const hasAttendanceToday = detail.lastAttendanceDate === today
  const attendanceActionLabel = hasAttendanceToday ? 'Editar asistencia de hoy' : 'Tomar asistencia hoy'
  const attendanceActionTo = hasAttendanceToday
    ? `/app/attendance/session?groupId=${detail.id}&date=${today}&mode=edit`
    : `/app/attendance/session?groupId=${detail.id}&mode=new`
  const studentsWithPendingDocuments = detail.students.filter((student) => student.documentProgressPercent < 100).length
  const studentsWithPendingChecklist = detail.students.filter((student) => student.checklistProgressPercent < 100).length

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
        <SecondaryButton asChild>
          <Link to={backTo}>{backLabel}</Link>
        </SecondaryButton>
        <SecondaryButton asChild>
          <Link to={attendanceActionTo} state={{ from: location.pathname + location.search, label: 'Volver al grupo' }}>{attendanceActionLabel}</Link>
        </SecondaryButton>
        <SecondaryButton asChild>
          <Link to={`/app/activities?groupId=${detail.id}`} state={{ from: location.pathname + location.search, label: 'Volver al grupo' }}>Ver actividades</Link>
        </SecondaryButton>
        <SecondaryButton
          type="button"
          onClick={() => {
            try {
              printGroupReport(detail)
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'No fue posible abrir impresion.')
            }
          }}
        >
          <Printer className="size-4" />
          Imprimir
        </SecondaryButton>
        <SecondaryButton
          type="button"
          onClick={async () => {
            try {
              await exportGroupReportPdf(detail)
              toast.success('PDF del grupo generado.')
            } catch {
              toast.error('No fue posible generar el PDF del grupo.')
            }
          }}
        >
          <Download className="size-4" />
          PDF
        </SecondaryButton>
      </div>

      <AppCard>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <EntityAvatar icon={Users} label={detail.name} tone="warning" className="size-16 sm:size-20" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{detail.name}</h2>
                  <Badge variant={detail.active ? 'success' : 'outline'}>
                    {detail.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatYearLabel(detail.year)} • {detail.schedule || 'Sin horario definido'}
                </p>
                <p className="mt-2 max-w-3xl text-xs text-muted-foreground sm:text-sm">
                  {detail.description || 'Sin descripción registrada para este grupo.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {detail.catechists.length === 0 ? (
                <Badge variant="outline">Sin catequista asignado</Badge>
              ) : (
                detail.catechists.map((catechist) => (
                  <Badge key={catechist} variant="secondary">
                    {catechist}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryCard title="Alumnos" value={detail.studentCount} icon={BookUser} />
            <SummaryCard title="Catequistas" value={detail.catechists.length} icon={Users} />
            <SummaryCard title="Asistencias" value={detail.attendanceSessions.length} icon={ClipboardCheck} />
            <SummaryCard title="Actividades" value={detail.activityCount} icon={NotebookPen} />
          </div>
        </div>
      </AppCard>

      <div className="grid gap-3 sm:grid-cols-3">
        <AppCard>
          <div>
            <p className="text-sm text-muted-foreground">Pendientes de checklist</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{studentsWithPendingChecklist}</p>
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
            <p className="text-sm text-muted-foreground">Ultima asistencia</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{detail.lastAttendanceDate ? formatDate(detail.lastAttendanceDate, 'dd MMM yyyy') : 'Sin registro'}</p>
          </div>
        </AppCard>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Lista de alumnos</TabsTrigger>
          <TabsTrigger value="attendance">Asistencia por fecha</TabsTrigger>
          <TabsTrigger value="grades-table">Notas de actividades</TabsTrigger>
          <TabsTrigger value="attendance-table">Reporte del grupo</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          {detail.students.length === 0 ? (
            <EmptyState
              title="Sin alumnos"
                description="Todavía no hay alumnos registrados en este grupo."
              icon={UserRound}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput
                  value={studentSearch}
                  onChange={setStudentSearch}
                  placeholder="Buscar alumno o acudiente"
                />
                <div className="rounded-[0.95rem] bg-secondary/35 px-3 py-2 text-sm text-muted-foreground">
                  Vista unica enfocada en seguimiento diario.
                </div>
              </div>
              {filteredStudents.length === 0 ? (
                <EmptyState
                  title="Sin coincidencias"
                  description="No hay alumnos que coincidan con la búsqueda actual."
                  icon={UserRound}
                />
              ) : (
                <>
                    <AppCard title="Lista de alumnos" description="Vista simple para encontrar, seguir avances y abrir la ficha del alumno.">
                      <div className="divide-y divide-border/70">
                        {pagedStudents.map((student) => (
                          <div key={student.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <EntityAvatar icon={UserRound} label={student.fullName} className="size-12" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-2">
                                  <p className="truncate font-semibold">{student.fullName}</p>
                                  <Badge variant={student.active ? 'success' : 'outline'} className="shrink-0">
                                    {student.active ? 'Activo' : 'Inactivo'}
                                  </Badge>
                                </div>
                                <p className="truncate text-sm text-muted-foreground">
                                  {student.age != null ? `${student.age} años • ` : ''}Asistencia {student.attendanceRate.toFixed(0)}%
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  Acudiente: {student.primaryGuardianName || 'Sin registrar'}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  Checklist {student.checklistProgressPercent}% • Documentos {student.documentProgressPercent}%
                                </p>
                              </div>
                            </div>
                            <SecondaryButton asChild>
                              <Link to={`/app/students/${student.id}`} state={detailState}>
                                Abrir ficha
                              </Link>
                            </SecondaryButton>
                          </div>
                        ))}
                      </div>
                    </AppCard>
                  <PaginationControls
                    page={studentPage}
                    pageSize={20}
                    hasNext={studentPage * 20 < filteredStudents.length}
                    hasPrevious={studentPage > 1}
                    label="Alumnos del grupo"
                    onNext={() => setStudentPage((current) => current + 1)}
                    onPrevious={() => setStudentPage((current) => Math.max(1, current - 1))}
                  />
                </>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance">
          {detail.attendanceSessions.length === 0 ? (
            <EmptyState
              title="Sin asistencias"
                description="Todavía no se han registrado jornadas de asistencia para este grupo."
              icon={CalendarDays}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput
                  value={attendanceSearch}
                  onChange={setAttendanceSearch}
                  placeholder="Buscar por fecha, alumno o nota"
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'ALL', label: 'Todos' },
                    { key: 'PRESENTE', label: 'Presentes' },
                    { key: 'AUSENTE', label: 'Ausentes' },
                    { key: 'JUSTIFICADO', label: 'Justificados' },
                  ].map((option) => {
                    const active = attendanceStatusFilter === option.key

                    return (
                      <button
                        key={option.key}
                        type="button"
                        className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                           active
                             ? 'border-border bg-secondary text-foreground'
                             : 'border-border/80 bg-white text-muted-foreground hover:bg-secondary/70'
                        }`}
                        onClick={() =>
                          setAttendanceStatusFilter(option.key as 'ALL' | AttendanceStatus)
                        }
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {filteredAttendanceSessions.length === 0 ? (
                <EmptyState
                  title="Sin coincidencias"
                  description="No hay jornadas o registros que coincidan con los filtros actuales."
                  icon={CalendarDays}
                />
              ) : (
                <AppCard>
                  <div className="divide-y divide-border/70">
                    {pagedAttendanceSessions.map((session) => (
                      <div key={session.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold">{formatDate(session.date, 'dd MMM yyyy')}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {session.counts.presentes} presentes • {session.counts.ausentes} ausentes • {session.counts.justificados} justificados
                            </p>
                            {session.notes ? <p className="mt-1 text-xs text-muted-foreground">{session.notes}</p> : null}
                          </div>
                          <SecondaryButton asChild>
                            <Link to={`/app/attendance/session?groupId=${detail.id}&date=${session.date}&mode=edit`} state={detailState}>
                              Abrir
                            </Link>
                          </SecondaryButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </AppCard>
              )}

              {filteredAttendanceSessions.length > 0 ? (
                <PaginationControls
                  page={attendancePage}
                  pageSize={20}
                  hasNext={attendancePage * 20 < filteredAttendanceSessions.length}
                  hasPrevious={attendancePage > 1}
                  label="Jornadas de asistencia"
                  onNext={() => setAttendancePage((current) => current + 1)}
                  onPrevious={() => setAttendancePage((current) => Math.max(1, current - 1))}
                />
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="grades-table">
          <AppCard
            title="Matriz de calificaciones por alumno"
            description="Consulta en una sola vista qué nota obtuvo cada estudiante en las actividades recientes del grupo."
            actions={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                     gradesScope === 'recent'
                       ? 'border-border bg-secondary text-foreground'
                       : 'border-border/80 bg-white text-muted-foreground'
                  }`}
                  onClick={() => setGradesScope('recent')}
                >
                  Últimas 5
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                     gradesScope === 'all'
                       ? 'border-border bg-secondary text-foreground'
                       : 'border-border/80 bg-white text-muted-foreground'
                  }`}
                  onClick={() => setGradesScope('all')}
                >
                  Todas
                </button>
                <SecondaryButton
                  type="button"
                  size="sm"
                  onClick={async () => {
                    const result = await exportCsvFile(
                      `matriz-notas-${detail.year}-${detail.name.toLowerCase().replaceAll(' ', '-')}.csv`,
                      detail.gradesMatrix.map((row) => ({
                        alumno: row.studentName,
                        ...Object.fromEntries(
                          visibleActivities.map((activity) => {
                            const entry = row.entries.find((grade) => grade.activityId === activity.id)
                            return [activity.title, entry?.grade != null ? `${entry.grade}/${entry.maxGrade}` : 'Pendiente']
                          }),
                        ),
                      })),
                      'Matriz de notas',
                    )
                    toast.success(result === 'shared' ? 'Matriz de notas compartida.' : 'Matriz de notas descargada.')
                  }}
                >
                  <Download className="size-4" />
                  CSV
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  size="sm"
                  onClick={async () => {
                    await exportGradesMatrixPdf(detail, visibleActivities)
                    toast.success('PDF de notas generado.')
                  }}
                >
                  <Download className="size-4" />
                  PDF
                </SecondaryButton>
              </div>
            }
          >
            {detail.gradesMatrix.length === 0 || visibleActivities.length === 0 ? (
              <EmptyState
                title="Sin notas registradas"
                description="Aún no hay actividades o calificaciones para mostrar en esta matriz."
                icon={NotebookPen}
              />
            ) : (
                <div className="no-scrollbar max-h-[70svh] overflow-auto pb-2">
                <table className="min-w-max border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-30 rounded-l-2xl bg-secondary/95 px-4 py-3 text-left font-semibold shadow-sm backdrop-blur">
                        Alumno
                      </th>
                      {visibleActivities.map((activity) => (
                        <th key={activity.id} className="sticky top-0 z-20 bg-secondary/95 px-4 py-3 text-left font-semibold whitespace-nowrap shadow-sm backdrop-blur">
                          <div>{activity.title}</div>
                          <div className="mt-1 text-xs font-normal text-muted-foreground">
                            {formatDate(activity.date, 'dd MMM')} • {activity.maxGrade} max
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                    <tbody>
                      {detail.gradesMatrix.map((row) => (
                        <tr key={row.studentId}>
                          <td className="sticky left-0 z-10 rounded-l-2xl bg-white px-4 py-3 font-medium whitespace-nowrap shadow-sm">
                            {row.studentName}
                          </td>
                          {visibleActivities.map((activity) => {
                            const entry = row.entries.find((grade) => grade.activityId === activity.id)

                          return (
                            <td key={activity.id} className="bg-white px-4 py-3 align-top">
                              <div className="font-medium">
                                {entry?.grade != null ? `${entry.grade}/${entry.maxGrade}` : 'Pendiente'}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {entry?.observations || 'Sin observación'}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AppCard>
        </TabsContent>

        <TabsContent value="attendance-table">
            <AppCard
              title="Matriz de asistencia por alumno y fecha"
              description="Consulta en una sola vista quién asistió, faltó o justificó en cada jornada registrada del grupo."
            actions={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                     attendanceScope === 'recent'
                       ? 'border-border bg-secondary text-foreground'
                       : 'border-border/80 bg-white text-muted-foreground'
                  }`}
                  onClick={() => setAttendanceScope('recent')}
                >
                  Últimas 5
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                     attendanceScope === 'all'
                       ? 'border-border bg-secondary text-foreground'
                       : 'border-border/80 bg-white text-muted-foreground'
                  }`}
                  onClick={() => setAttendanceScope('all')}
                >
                  Todas
                </button>
                <SecondaryButton
                  type="button"
                  size="sm"
                  onClick={async () => {
                    const result = await exportCsvFile(
                      `matriz-asistencia-${detail.year}-${detail.name.toLowerCase().replaceAll(' ', '-')}.csv`,
                      visibleAttendanceMatrix.map((row) => ({
                        alumno: row.studentName,
                        ...Object.fromEntries(
                          row.entries.map((entry) => [
                            formatDate(entry.date, 'dd MMM yyyy'),
                            entry.status === 'SIN_REGISTRO' ? 'Sin registro' : entry.status,
                          ]),
                        ),
                      })),
                      'Matriz de asistencia',
                    )
                    toast.success(result === 'shared' ? 'Matriz de asistencia compartida.' : 'Matriz de asistencia descargada.')
                  }}
                >
                  <Download className="size-4" />
                  CSV
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  size="sm"
                  onClick={async () => {
                    await exportAttendanceMatrixPdf(detail, visibleAttendanceSessions, visibleAttendanceMatrix)
                    toast.success('PDF de asistencia generado.')
                  }}
                >
                  <Download className="size-4" />
                  PDF
                </SecondaryButton>
              </div>
            }
          >
            {visibleAttendanceMatrix.length === 0 || visibleAttendanceSessions.length === 0 ? (
              <EmptyState
                title="Sin asistencias registradas"
                description="Aún no hay jornadas para mostrar en esta matriz de asistencia."
                icon={ClipboardCheck}
              />
            ) : (
              <div className="no-scrollbar max-h-[70svh] overflow-auto pb-2">
                <table className="min-w-max border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-30 rounded-l-2xl bg-secondary/95 px-4 py-3 text-left font-semibold shadow-sm backdrop-blur">
                        Alumno
                      </th>
                      {visibleAttendanceSessions.map((session) => (
                        <th key={session.id} className="sticky top-0 z-20 bg-secondary/95 px-4 py-3 text-left font-semibold whitespace-nowrap shadow-sm backdrop-blur">
                          <div>{formatDate(session.date, 'dd MMM')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAttendanceMatrix.map((row) => (
                      <tr key={row.studentId}>
                        <td className="sticky left-0 z-10 rounded-l-2xl bg-white px-4 py-3 font-medium whitespace-nowrap shadow-sm">
                          {row.studentName}
                          </td>
                        {row.entries.map((entry) => (
                          <td key={`${row.studentId}-${entry.date}`} className="bg-white px-4 py-3 align-top">
                            <Badge
                              variant={
                                entry.status === 'PRESENTE'
                                  ? 'success'
                                  : entry.status === 'AUSENTE'
                                    ? 'destructive'
                                    : entry.status === 'JUSTIFICADO'
                                      ? 'warning'
                                      : 'outline'
                              }
                            >
                              {entry.status === 'SIN_REGISTRO' ? 'Sin registro' : entry.status}
                            </Badge>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {entry.observations || 'Sin observación'}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AppCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
