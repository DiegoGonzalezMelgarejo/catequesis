import { NavLink } from 'react-router-dom'

import type { NavigationItem } from '@/theme/navigation'
import { cn } from '@/utils/cn'

type MobileBottomNavigationProps = {
  items: NavigationItem[]
}

export function MobileBottomNavigation({ items }: MobileBottomNavigationProps) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 px-3 pb-3 lg:hidden">
      <div
        className="mx-auto grid max-w-3xl gap-1 rounded-[1.5rem] border border-white/80 bg-white/94 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[1rem] border border-transparent px-1 py-2.5 text-[10px] font-medium leading-tight text-muted-foreground transition sm:px-2 sm:text-[11px]',
                  item.highlight && 'mx-0.5 -mt-5 rounded-[1.2rem] bg-primary px-2.5 py-3.5 text-primary-foreground shadow-soft',
                  isActive && !item.highlight && 'border-primary bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(109,94,252,0.35)]',
                  isActive && item.highlight && 'bg-primary text-primary-foreground ring-2 ring-primary/25 shadow-[0_14px_30px_rgba(109,94,252,0.4)]',
                )
              }
            >
              <Icon className={cn('size-[18px]', item.highlight && 'size-5')} />
              <span className="max-w-full text-center break-words">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
