import { useEffect, useMemo, useState } from 'react'
import {
  BookUser,
  CalendarDays,
  CheckCheck,
  ClipboardCheck,
  Download,
  Eye,
  GraduationCap,
  Layers3,
  NotebookPen,
  Printer,
  UserRound,
  Users,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
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
import { getGroupDetail } from '@/services/group-service'
import type { AttendanceStatus } from '@/types/models'
import { exportCsvFile } from '@/utils/csv'
import { formatDate, formatRelativeDate } from '@/utils/date'
import {
  exportAttendanceMatrixPdf,
  exportGradesMatrixPdf,
  exportGroupReportPdf,
  printGroupReport,
} from '@/utils/group-report'

const attendanceVariant = {
  PRESENTE: 'success',
  AUSENTE: 'destructive',
  JUSTIFICADO: 'warning',
} as const

export function GroupDetailPage() {
  const { user } = useAuth()
  const { groupId } = useParams()
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <SecondaryButton asChild>
          <Link to="/app/groups">Volver a grupos</Link>
        </SecondaryButton>
        <SecondaryButton asChild>
          <Link to={`/app/attendance/session?groupId=${detail.id}&mode=new`}>Nueva toma de asistencia</Link>
        </SecondaryButton>
        <SecondaryButton asChild>
          <Link to={`/app/activities?groupId=${detail.id}`}>Ver actividades</Link>
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
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <EntityAvatar icon={Users} label={detail.name} tone="warning" className="size-20" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight">{detail.name}</h2>
                  <Badge variant={detail.active ? 'success' : 'outline'}>
                    {detail.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {detail.schedule || 'Sin horario definido'}
                </p>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Alumnos activos" value={detail.studentCount} icon={BookUser} />
            <SummaryCard title="Catequistas" value={detail.catechists.length} icon={Users} />
            <SummaryCard title="Jornadas" value={detail.attendanceSessions.length} icon={ClipboardCheck} />
            <SummaryCard title="Actividades" value={detail.activityCount} icon={NotebookPen} />
          </div>
        </div>
      </AppCard>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Alumnos</TabsTrigger>
          <TabsTrigger value="attendance">Asistencia por fecha</TabsTrigger>
          <TabsTrigger value="grades-table">Notas por alumno</TabsTrigger>
          <TabsTrigger value="attendance-table">Asistencias por alumno</TabsTrigger>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
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
              <SearchInput
                value={studentSearch}
                onChange={setStudentSearch}
                placeholder="Buscar alumno o acudiente"
              />
              {filteredStudents.length === 0 ? (
                <EmptyState
                  title="Sin coincidencias"
                  description="No hay alumnos que coincidan con la búsqueda actual."
                  icon={UserRound}
                />
              ) : (
                <>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {pagedStudents.map((student) => (
                      <AppCard key={student.id} interactive>
                        <div className="space-y-4">
                          <div className="flex items-start gap-4 rounded-[1.5rem] bg-gradient-to-br from-primary/6 via-white to-cyan-400/5 p-4">
                            <EntityAvatar icon={UserRound} label={student.fullName} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-lg font-semibold">{student.fullName}</p>
                                  <p className="text-sm text-muted-foreground">{student.age} años</p>
                                </div>
                                <Badge variant={student.active ? 'success' : 'outline'}>
                                  {student.active ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </div>
                              <p className="mt-3 text-sm text-muted-foreground">Toca el botón para abrir la ficha completa del alumno.</p>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                              <p className="text-muted-foreground">Acudiente principal</p>
                              <p className="mt-1 font-medium">
                                {student.primaryGuardianName || 'Sin acudiente'}
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                {student.primaryGuardianPhone || 'Sin contacto'}
                              </p>
                            </div>
                            <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                              <p className="text-muted-foreground">Sacramentos</p>
                              <p className="mt-1 font-medium">{student.sacramentCount}</p>
                              <p className="mt-1 text-muted-foreground">
                                {student.guardianCount} acudientes registrados
                              </p>
                            </div>
                            <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                              <p className="text-muted-foreground">Asistencia</p>
                              <p className="mt-1 font-medium">{student.attendanceRate.toFixed(0)}%</p>
                              <p className="mt-1 text-muted-foreground">
                                {student.absenceCount} faltas acumuladas
                              </p>
                            </div>
                            <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                              <p className="text-muted-foreground">Última asistencia</p>
                              <p className="mt-1 font-medium">
                                {student.lastAttendanceDate ? formatDate(student.lastAttendanceDate) : 'Sin registro'}
                              </p>
                              {student.lastAttendanceStatus ? (
                                <Badge
                                  variant={attendanceVariant[student.lastAttendanceStatus]}
                                  className="mt-2"
                                >
                                  {student.lastAttendanceStatus}
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="max-w-xl text-sm text-muted-foreground">
                              {student.observations || 'Sin observaciones registradas.'}
                            </p>
                            <SecondaryButton asChild>
                              <Link to={`/app/students/${student.id}`}>
                                <Eye className="size-4" />
                                Ver alumno
                              </Link>
                            </SecondaryButton>
                          </div>
                        </div>
                      </AppCard>
                    ))}
                  </div>
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
                            ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
                            : 'border-white/70 bg-white text-muted-foreground hover:bg-secondary/70'
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
                pagedAttendanceSessions.map((session) => (
                <AppCard key={session.id}>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold">{formatDate(session.date, 'EEEE dd MMM yyyy')}</p>
                          <Badge variant="secondary">{session.records.length} registros</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {session.notes || 'Sin observaciones generales para esta jornada.'}
                        </p>
                      </div>
                      <SecondaryButton asChild>
                        <Link to={`/app/attendance/session?groupId=${detail.id}&date=${session.date}&mode=edit`}>
                          Editar asistencia
                        </Link>
                      </SecondaryButton>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1.25rem] border border-success/20 bg-success/10 p-4 text-sm text-success">
                        <p className="text-muted-foreground">Presentes</p>
                        <p className="mt-1 font-medium">{session.counts.presentes}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                        <p className="text-muted-foreground">Ausentes</p>
                        <p className="mt-1 font-medium">{session.counts.ausentes}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-warning/25 bg-warning/15 p-4 text-sm text-foreground">
                        <p className="text-muted-foreground">Justificados</p>
                        <p className="mt-1 font-medium">{session.counts.justificados}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-2">
                      {session.records.map((record) => (
                        <div
                          key={`${session.id}-${record.studentId}`}
                          className="rounded-[1.5rem] border border-white/70 bg-white p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{record.studentName}</p>
                            <Badge variant={attendanceVariant[record.status]}>{record.status}</Badge>
                          </div>
                          {record.observations ? (
                            <p className="mt-2 text-sm text-muted-foreground">{record.observations}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </AppCard>
                ))
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

        <TabsContent value="summary">
          <div className="grid gap-4 xl:grid-cols-2">
            <AppCard title="Equipo asignado" description="Catequistas vinculados a este grupo.">
              <div className="flex flex-wrap gap-2">
                {detail.catechists.length === 0 ? (
                  <Badge variant="outline">Sin catequistas</Badge>
                ) : (
                  detail.catechists.map((catechist) => (
                    <Badge key={catechist} variant="secondary">
                      {catechist}
                    </Badge>
                  ))
                )}
              </div>
            </AppCard>

            <AppCard title="Última jornada" description="Referencia rápida del último encuentro registrado.">
              {detail.lastAttendanceDate ? (
                <div className="space-y-2">
                  <Badge>{formatDate(detail.lastAttendanceDate)}</Badge>
                  <p className="text-sm text-muted-foreground">
                    Última jornada registrada {formatRelativeDate(`${detail.lastAttendanceDate}T12:00:00`)}.
                  </p>
                </div>
              ) : (
                <EmptyState
                  title="Sin jornadas"
                  description="Aún no hay asistencia registrada para este grupo."
                  icon={CheckCheck}
                />
              )}
            </AppCard>

            <AppCard title="Actividades recientes" description="Últimas actividades vinculadas al grupo.">
              <div className="space-y-3">
                {detail.recentActivities.length === 0 ? (
                  <EmptyState
                    title="Sin actividades"
                    description="No hay actividades registradas para este grupo."
                    icon={GraduationCap}
                  />
                ) : (
                  detail.recentActivities.map((activity) => (
                    <div key={activity.id} className="rounded-3xl border bg-secondary/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(activity.date)} • {activity.type}
                          </p>
                        </div>
                        <Badge variant={activity.active ? 'default' : 'outline'}>
                          {activity.maxGrade} max
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AppCard>

            <AppCard title="Seguimiento del grupo" description="Estado actual del grupo para la operación diaria.">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                  <p className="text-muted-foreground">Alumnos activos</p>
                  <p className="mt-1 font-medium">{detail.studentCount}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                  <p className="text-muted-foreground">Actividades pendientes</p>
                  <p className="mt-1 font-medium">{detail.pendingActivities}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                  <p className="text-muted-foreground">Jornadas registradas</p>
                  <p className="mt-1 font-medium">{detail.attendanceSessions.length}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/70 bg-secondary/35 p-4 text-sm">
                  <p className="text-muted-foreground">Catequistas asignados</p>
                  <p className="mt-1 font-medium">{detail.catechists.length}</p>
                </div>
              </div>
            </AppCard>
          </div>
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
                      ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
                      : 'border-white/70 bg-white text-muted-foreground'
                  }`}
                  onClick={() => setGradesScope('recent')}
                >
                  Últimas 5
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                    gradesScope === 'all'
                      ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
                      : 'border-white/70 bg-white text-muted-foreground'
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
                      `matriz-notas-${detail.name.toLowerCase().replaceAll(' ', '-')}.csv`,
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
                      ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
                      : 'border-white/70 bg-white text-muted-foreground'
                  }`}
                  onClick={() => setAttendanceScope('recent')}
                >
                  Últimas 5
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                    attendanceScope === 'all'
                      ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
                      : 'border-white/70 bg-white text-muted-foreground'
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
                      `matriz-asistencia-${detail.name.toLowerCase().replaceAll(' ', '-')}.csv`,
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
