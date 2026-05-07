import { NavLink } from 'react-router-dom'

import type { NavigationItem } from '@/theme/navigation'
import { cn } from '@/utils/cn'

type MobileBottomNavigationProps = {
  items: NavigationItem[]
}

export function MobileBottomNavigation({ items }: MobileBottomNavigationProps) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-white/70 bg-white/90 backdrop-blur xl:left-1/2 xl:max-w-6xl xl:-translate-x-1/2">
      <div className="mx-auto grid max-w-6xl grid-cols-5 gap-1 px-1.5 py-2.5 sm:px-2 sm:py-3">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-medium text-muted-foreground transition sm:px-2 sm:text-[11px]',
                  isActive && 'bg-primary/10 text-primary',
                )
              }
            >
              <Icon className="size-4" />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
