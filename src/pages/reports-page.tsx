import { ChartColumn, Download, FileText, Share2, TriangleAlert } from 'lucide-react'
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
    <div className="space-y-6">
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
              report.rows.map((row) => (
                <AppCard key={row.groupId}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{row.groupName}</p>
                        <p className="text-sm text-muted-foreground">{row.catechists}</p>
                      </div>
                      <Badge>{row.students} alumnos</Badge>
                    </div>
                    {user.role === 'ADMIN' ? (
                      <div className="flex flex-wrap gap-2">
                        <PrimaryButton type="button" onClick={() => void handleExportGroupAttendancePdf(row.groupId)}>
                          <FileText className="size-4" />
                          PDF asistencias
                        </PrimaryButton>
                        <PrimaryButton type="button" onClick={() => void handleExportGroupGradesPdf(row.groupId)}>
                          <FileText className="size-4" />
                          PDF notas
                        </PrimaryButton>
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-3xl bg-secondary/35 p-4 text-sm">
                        <p className="text-muted-foreground">Asistencia</p>
                        <p className="mt-1 font-medium">{row.attendanceRate.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-3xl bg-secondary/35 p-4 text-sm">
                        <p className="text-muted-foreground">Promedio</p>
                        <p className="mt-1 font-medium">{row.averageGrade.toFixed(1)}</p>
                      </div>
                      <div className="rounded-3xl bg-secondary/35 p-4 text-sm">
                        <p className="text-muted-foreground">Pendientes</p>
                        <p className="mt-1 font-medium">{row.pendingActivities}</p>
                      </div>
                    </div>
                  </div>
                </AppCard>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="space-y-3">
            {report.rows.map((row) => (
              <AppCard key={`${row.groupId}-attendance`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{row.groupName}</p>
                    <p className="text-sm text-muted-foreground">{row.students} alumnos registrados</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{row.attendanceRate.toFixed(1)}%</Badge>
                    {user.role === 'ADMIN' ? (
                      <>
                        <SecondaryButton type="button" onClick={() => void handleExportGroupAttendancePdf(row.groupId)}>
                          <Download className="size-4" />
                          PDF asistencias
                        </SecondaryButton>
                        <SecondaryButton type="button" onClick={() => void handleExportGroupGradesPdf(row.groupId)}>
                          <Download className="size-4" />
                          PDF notas
                        </SecondaryButton>
                      </>
                    ) : null}
                  </div>
                </div>
              </AppCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          {alerts.length === 0 ? (
            <EmptyState title="Sin alertas" description="No hay alertas activas para exportar." icon={TriangleAlert} />
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
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
    </div>
  )
}
