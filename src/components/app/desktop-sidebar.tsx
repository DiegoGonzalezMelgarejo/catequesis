import { NavLink } from 'react-router-dom'

import { Badge } from '@/components/app/badge'
import type { Role } from '@/types/models'
import { navigationByRole, secondaryNavigationByRole, type NavigationItem } from '@/theme/navigation'
import { cn } from '@/utils/cn'
import { formatRoleLabel } from '@/utils/role'

type DesktopSidebarProps = {
  role: Role
}

function NavigationSection({ title, items }: { title: string; items: NavigationItem[] }) {
  return (
    <div className="space-y-2.5">
      <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <div className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-[1rem] border border-transparent px-3 py-3 text-sm font-medium text-muted-foreground transition',
                  'hover:border-primary/10 hover:bg-secondary/80 hover:text-foreground',
                  isActive && 'border-primary/15 bg-primary text-primary-foreground shadow-soft hover:bg-primary hover:text-primary-foreground',
                )
              }
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[0.9rem] bg-secondary/80 transition group-hover:bg-white/80">
                <Icon className="size-4 shrink-0" />
              </div>
              <span className="min-w-0 flex-1">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}

export function DesktopSidebar({ role }: DesktopSidebarProps) {
  const primaryItems = navigationByRole[role]
  const secondaryItems = secondaryNavigationByRole[role]
  const helperText = role === 'SUPER_ADMIN'
    ? 'Administra la plataforma, crea parroquias y asigna sus administradores.'
    : 'Gestiona la parroquia con una vista de escritorio más clara.'

  return (
    <aside className="hidden lg:flex lg:min-h-svh lg:flex-col lg:py-1">
      <div className="sticky top-5 flex min-h-[calc(100svh-2.5rem)] flex-col gap-6">
        <div className="rounded-[1.75rem] border border-white/80 bg-white/92 px-5 py-5 shadow-card backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Catequesis</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Panel web</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{helperText}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="default">{formatRoleLabel(role)}</Badge>
          </div>
        </div>

        <div className="flex-1 space-y-5 rounded-[1.75rem] border border-white/80 bg-white/92 px-3 py-4 shadow-card backdrop-blur-xl">
          <NavigationSection title="Principal" items={primaryItems} />
          {secondaryItems.length > 0 ? <NavigationSection title="Herramientas" items={secondaryItems} /> : null}
        </div>
      </div>
    </aside>
  )
}
