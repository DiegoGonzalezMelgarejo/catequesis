import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/utils/cn'

type FloatingActionButtonProps = {
  to: string
  label: string
  icon: LucideIcon
}

export function FloatingActionButton({ to, label, icon: Icon }: FloatingActionButtonProps) {
  return (
    <NavLink
      to={to}
      className={cn(
        'fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95 sm:right-8',
      )}
    >
      <Icon className="size-4" />
      {label}
    </NavLink>
  )
}
