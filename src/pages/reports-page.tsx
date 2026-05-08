import { ChartColumn, Download, Share2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { EmptyState } from '@/components/app/empty-state'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { PrimaryButton } from '@/components/app/primary-button'
import { SecondaryButton } from '@/components/app/secondary-button'
import { SummaryCard } from '@/components/app/summary-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/app/tabs'
import { useAsyncData } from '@/hooks/use-async-data'
import { useAuth } from '@/hooks/use-auth'
import { getAlertItems } from '@/services/alert-service'
import { getGroupDetail } from '@/services/group-service'
import { getReportData } from '@/services/report-service'
import { exportCsvFile } from '@/utils/csv'
import { exportAttendanceMatrixPdf, exportGradesMatrixPdf } from '@/utils/group-report'

export function ReportsPage() {
  const { user } = useAuth()
  const { data, loading } = useAsyncData(
    async () => {
      if (!user) {
        return null
      }

      const [report, alerts] = await Promise.all([getReportData(user), getAlertItems(user)])
      return { report, alerts }
    },
    [user?.id, user?.role],
  )

  if (!user || loading || !data) {
    return <PageSkeleton variant="dashboard" />
  }

  const currentUser = user
  const report = data.report
  const alerts = data.alerts

  async function handleExportSummary() {
    try {
      const result = await exportCsvFile(
        'reporte-grupos.csv',
        report.rows.map((row) => ({
          grupo: row.groupName,
          catequistas: row.catechists,
          alumnos: row.students,
          asistencia_porcentaje: row.attendanceRate.toFixed(2),
          promedio_notas: row.averageGrade.toFixed(2),
          actividades_pendientes: row.pendingActivities,
        })),
        'Reporte de grupos',
      )

      toast.success(result === 'shared' ? 'Reporte compartido.' : 'Reporte descargado.')
    } catch {
      toast.error('No fue posible exportar el reporte.')
    }
  }

  async function handleExportAlerts() {
    try {
      const result = await exportCsvFile(
        'alertas-catequesis.csv',
        alerts.map((alert) => ({
          gravedad: alert.severity,
          titulo: alert.title,
          descripción: alert.description,
          grupo: alert.groupName ?? '',
          alumno: alert.studentName ?? '',
        })),
        'Alertas de catequesis',
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Grupos" value={report.totalGroups} icon={ChartColumn} />
        <SummaryCard title="Alumnos" value={report.totalStudents} icon={ChartColumn} />
        <SummaryCard title="Asistencia global" value={`${report.overallAttendanceRate.toFixed(1)}%`} icon={ChartColumn} />
        <SummaryCard title="Pendientes" value={report.totalPendingActivities} icon={TriangleAlert} />
      </div>

      <div className="flex flex-wrap gap-3">
        <PrimaryButton type="button" onClick={handleExportSummary}>
          <Download className="size-4" />
          Exportar grupos CSV
        </PrimaryButton>
        <PrimaryButton type="button" onClick={handleExportAlerts}>
          <Share2 className="size-4" />
          Exportar alertas CSV
        </PrimaryButton>
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
              <EmptyState title="Sin datos" description="Aún no hay grupos con información suficiente." icon={ChartColumn} />
            ) : (
              <AppCard title="Listado de grupos" description="Vista simple del estado general de cada grupo.">
                <div className="divide-y divide-border/70">
                  {report.rows.map((row) => (
                    <div key={row.groupId} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{row.groupName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{row.catechists}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.students} alumnos • Asistencia {row.attendanceRate.toFixed(1)}% • Promedio {row.averageGrade.toFixed(1)} • Pendientes {row.pendingActivities}
                          </p>
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
            <EmptyState title="Sin alertas" description="No hay alertas activas para exportar." icon={TriangleAlert} />
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
