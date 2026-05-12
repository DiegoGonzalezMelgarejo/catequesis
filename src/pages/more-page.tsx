import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AppCard } from '@/components/app/app-card'
import { Badge } from '@/components/app/badge'
import { YearManagementPanel } from '@/components/app/year-management-panel'
import { useActiveYear } from '@/hooks/use-active-year'
import { useAuth } from '@/hooks/use-auth'
import { secondaryNavigationByRole } from '@/theme/navigation'
import { formatRoleLabel } from '@/utils/role'
import { formatYearLabel } from '@/utils/year'

export function MorePage() {
  const { user } = useAuth()
  const { activeYear, availableYears, setActiveYear, createYearPeriod } = useActiveYear()

  if (!user) {
    return null
  }

  const secondaryItems = secondaryNavigationByRole[user.role]

  return (
    <div className="space-y-4 sm:space-y-6">
      {activeYear ? (
        <AppCard title="Año de trabajo" description="Cambia aqui el corte activo para ver, crear y editar datos del año correcto.">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Activo</Badge>
              <p className="font-semibold text-foreground">{formatYearLabel(activeYear)}</p>
            </div>
            <YearManagementPanel activeYear={activeYear} availableYears={availableYears} onSelectYear={setActiveYear} onCreateYear={createYearPeriod} canCreate={user.role === 'ADMIN'} />
          </div>
        </AppCard>
      ) : null}

      <AppCard
        title="Herramientas complementarias"
        description="Aqui quedan las opciones menos frecuentes para mantener la navegacion principal mas clara."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {secondaryItems.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-[1rem] border border-border/70 bg-white px-4 py-4 transition hover:border-primary/20 hover:bg-secondary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-3">
                    <div className="flex size-11 items-center justify-center rounded-[0.95rem] bg-secondary text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.to === '/app/alerts' && 'Revisa riesgos y pendientes.'}
                        {item.to === '/app/reports' && 'Exporta reportes y matrices.'}
                        {item.to === '/app/catechists' && 'Administra los catequistas y sus accesos.'}
                        {item.to === '/app/checklists' && 'Configura contenidos doctrinales.'}
                        {item.to === '/app/documents' && 'Define documentos requeridos.'}
                        {item.to === '/app/parishes' && 'Crea parroquias y asigna administradores.'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            )
          })}
        </div>
      </AppCard>

      <div className="grid gap-4 md:grid-cols-2">
        <AppCard title="Como usar mejor la app" description="Orden sugerido para trabajar sin perder tiempo.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">1.</span> Empieza por <span className="font-medium text-foreground">Asistencia</span> en cada encuentro.</p>
            <p><span className="font-medium text-foreground">2.</span> Revisa <span className="font-medium text-foreground">Alertas</span> antes de cerrar la jornada.</p>
            <p><span className="font-medium text-foreground">3.</span> Usa <span className="font-medium text-foreground">Grupos</span> y <span className="font-medium text-foreground">Alumnos</span> para actualizar fichas.</p>
          </div>
        </AppCard>

        <AppCard title="Rol actual" description="Referencia rapida del perfil con el que estas trabajando.">
          <div className="flex items-center gap-3">
            <Badge variant="default">{formatRoleLabel(user.role)}</Badge>
            <p className="text-sm text-muted-foreground">
              {user.role === 'SUPER_ADMIN'
                ? 'Tienes acceso global para crear parroquias y asignar administradores.'
                : user.role === 'ADMIN'
                ? 'Tienes acceso a administracion, configuracion y reportes.'
                : 'Tienes acceso a seguimiento, asistencia y reportes de tus grupos.'}
            </p>
          </div>
        </AppCard>
      </div>
    </div>
  )
}
