import { ChartColumn, Download, Share2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PrimaryButton } from '@/components/app/primary-button'
import { RefreshDataButton } from '@/components/app/refresh-data-button'
import { SecondaryButton } from '@/components/app/secondary-button'
import { SummaryCard } from '@/components/app/summary-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/app/tabs'
import { useActiveYear } from '@/hooks/use-active-year'
import { useAsyncData } from '@/hooks/use-async-data'
import { useAuth } from '@/hooks/use-auth'
import { getAlertItems } from '@/services/alert-service'
import { getGroupDetail } from '@/services/group-service'
import { getReportData } from '@/services/report-service'
import { exportCsvFile } from '@/utils/csv'
import { exportAttendanceMatrixPdf, exportGradesMatrixPdf } from '@/utils/group-report'
import { formatYearLabel } from '@/utils/year'

export function ReportsPage() {
  const { user } = useAuth()
  const { activeYear } = useActiveYear()
  const { data, loading } = useAsyncData(
    async () => {
      if (!user || !activeYear) {
        return null
      }

      const [report, alerts] = await Promise.all([getReportData(user, activeYear), getAlertItems(user, activeYear)])
      return { report, alerts }
    },
    [user?.id, user?.role, activeYear],
  )

  if (!user || !activeYear || loading || !data) {
    return <PageSkeleton variant="dashboard" />
  }

  const currentUser = user
  const report = data.report
  const alerts = data.alerts
  const activeYearLabel = formatYearLabel(activeYear)
  const topAttendanceGroup = report.rows.reduce<(typeof report.rows)[number] | null>(
    (best, row) => (!best || row.attendanceRate > best.attendanceRate ? row : best),
    null,
  )
  const topPendingGroup = report.rows.reduce<(typeof report.rows)[number] | null>(
    (best, row) => (!best || row.pendingActivities > best.pendingActivities ? row : best),
    null,
  )

  async function handleExportSummary() {
    try {
        const result = await exportCsvFile(
        `reporte-grupos-${activeYear}.csv`,
        report.rows.map((row) => ({
          grupo: row.groupName,
          catequistas: row.catechists,
          alumnos: row.students,
          asistencia_porcentaje: row.attendanceRate.toFixed(2),
          promedio_notas: row.averageGrade.toFixed(2),
          actividades_pendientes: row.pendingActivities,
        })),
        `Reporte de grupos ${activeYearLabel}`,
      )

      toast.success(result === 'shared' ? 'Reporte compartido.' : 'Reporte descargado.')
    } catch {
      toast.error('No fue posible exportar el reporte.')
    }
  }

  async function handleExportAlerts() {
    try {
        const result = await exportCsvFile(
        `alertas-catequesis-${activeYear}.csv`,
        alerts.map((alert) => ({
          gravedad: alert.severity,
          titulo: alert.title,
          descripción: alert.description,
          grupo: alert.groupName ?? '',
          alumno: alert.studentName ?? '',
        })),
        `Alertas de catequesis ${activeYearLabel}`,
      )

      toast.success(result === 'shared' ? 'Alertas compartidas.' : 'Alertas descargadas.')
    } catch {
      toast.error('No fue posible exportar las alertas.')
    }
  }

  async function handleExportGroupAttendancePdf(groupId: string) {
    try {
      const detail = await getGroupDetail(currentUser, groupId)

      if (!detail) {
        toast.error('No fue posible cargar el grupo para exportar asistencia.')
        return
      }

      await exportAttendanceMatrixPdf(detail, detail.attendanceSessions, detail.attendanceMatrix)
      toast.success('PDF de asistencias generado.')
    } catch {
      toast.error('No fue posible exportar el PDF de asistencias.')
    }
  }

  async function handleExportGroupGradesPdf(groupId: string) {
    try {
      const detail = await getGroupDetail(currentUser, groupId)

      if (!detail) {
        toast.error('No fue posible cargar el grupo para exportar notas.')
        return
      }

      await exportGradesMatrixPdf(detail, detail.allActivities)
      toast.success('PDF de notas generado.')
    } catch {
      toast.error('No fue posible exportar el PDF de notas.')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-end">
        <RefreshDataButton cachePrefixes={['reports-', 'alerts-', 'nav-', 'access-']} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Grupos" value={report.totalGroups} icon={ChartColumn} />
        <SummaryCard title="Alumnos" value={report.totalStudents} icon={ChartColumn} />
        <SummaryCard title="Asistencia global" value={`${report.overallAttendanceRate.toFixed(1)}%`} icon={ChartColumn} />
        <SummaryCard title="Pendientes" value={report.totalPendingActivities} icon={TriangleAlert} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AppCard title="Trabajo recomendado" description="Revisa primero lo mas relevante y luego exporta solo el reporte que necesites compartir.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[0.95rem] bg-secondary/35 px-4 py-4">
              <p className="text-sm text-muted-foreground">Mejor asistencia</p>
              <p className="mt-1 font-semibold text-foreground">{topAttendanceGroup?.groupName ?? 'Sin datos'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {topAttendanceGroup ? `${topAttendanceGroup.attendanceRate.toFixed(1)}% de asistencia` : 'Aún no hay registros suficientes.'}
              </p>
            </div>
            <div className="rounded-[0.95rem] bg-secondary/35 px-4 py-4">
              <p className="text-sm text-muted-foreground">Mayor carga pendiente</p>
              <p className="mt-1 font-semibold text-foreground">{topPendingGroup?.groupName ?? 'Sin datos'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {topPendingGroup ? `${topPendingGroup.pendingActivities} actividades pendientes` : 'Aún no hay pendientes registrados.'}
              </p>
            </div>
          </div>
        </AppCard>

        <AppCard title="Exportaciones" description="Accesos directos para compartir informacion sin recorrer todo el reporte.">
          <div className="space-y-3">
            <PrimaryButton className="w-full justify-start" type="button" onClick={handleExportSummary}>
              <Download className="size-4" />
              Exportar grupos CSV
            </PrimaryButton>
            <PrimaryButton className="w-full justify-start" type="button" onClick={handleExportAlerts}>
              <Share2 className="size-4" />
              Exportar alertas CSV
            </PrimaryButton>
          </div>
        </AppCard>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="attendance">Asistencia</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="space-y-4">
            {data.report.rows.length === 0 ? (
              <EmptyState title="Sin datos" description="Todavia no hay informacion suficiente para construir este reporte." icon={ChartColumn} />
            ) : (
              <AppCard title="Listado de grupos" description="Revisa primero el estado general y luego exporta el detalle del grupo que lo necesite.">
                <div className="divide-y divide-border/70">
                  {report.rows.map((row) => (
                    <div key={row.groupId} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{row.groupName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{row.catechists}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full bg-secondary px-3 py-1">{row.students} alumnos</span>
                            <span className="rounded-full bg-secondary px-3 py-1">Asistencia {row.attendanceRate.toFixed(1)}%</span>
                            <span className="rounded-full bg-secondary px-3 py-1">Promedio {row.averageGrade.toFixed(1)}</span>
                            <span className="rounded-full bg-secondary px-3 py-1">Pendientes {row.pendingActivities}</span>
                          </div>
                        </div>
                        {user.role === 'ADMIN' ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <SecondaryButton type="button" onClick={() => void handleExportGroupAttendancePdf(row.groupId)}>
                              PDF asistencia
                            </SecondaryButton>
                            <SecondaryButton type="button" onClick={() => void handleExportGroupGradesPdf(row.groupId)}>
                              PDF notas
                            </SecondaryButton>
                          </div>
                        ) : (
                          <Badge>{row.students} alumnos</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AppCard>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <AppCard title="Asistencia por grupo" description="Vista compacta para exportar o revisar rápidamente.">
            <div className="divide-y divide-border/70">
              {report.rows.map((row) => (
                <div key={`${row.groupId}-attendance`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{row.groupName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.students} alumnos • Asistencia {row.attendanceRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{row.attendanceRate.toFixed(1)}%</Badge>
                      {user.role === 'ADMIN' ? (
                        <SecondaryButton type="button" onClick={() => void handleExportGroupAttendancePdf(row.groupId)}>
                          PDF
                        </SecondaryButton>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AppCard>
        </TabsContent>

        <TabsContent value="alerts">
          {alerts.length === 0 ? (
            <EmptyState title="Sin alertas" description="No hay alertas activas para incluir en la exportacion." icon={TriangleAlert} />
          ) : (
            <AppCard title="Listado de alertas" description="Vista simple para revisar y exportar alertas activas.">
              <div className="divide-y divide-border/70">
                {alerts.map((alert) => (
                  <div key={alert.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                      <Badge variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'warning' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </AppCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
