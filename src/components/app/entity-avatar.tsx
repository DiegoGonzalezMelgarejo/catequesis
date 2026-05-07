import type { LucideIcon } from 'lucide-react'

import { cn } from '@/utils/cn'

type EntityAvatarProps = {
  icon: LucideIcon
  label: string
  tone?: 'primary' | 'success' | 'warning'
  className?: string
}

const toneStyles = {
  primary: 'from-primary/20 via-primary/10 to-cyan-400/15 text-primary',
  success: 'from-success/20 via-success/10 to-emerald-300/15 text-success',
  warning: 'from-warning/25 via-warning/10 to-amber-200/20 text-foreground',
} as const

function getInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'NA'
}

export function EntityAvatar({ icon: Icon, label, tone = 'primary', className }: EntityAvatarProps) {
  return (
    <div
      className={cn(
        'relative flex size-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-gradient-to-br ring-1 ring-white/80 shadow-sm',
        toneStyles[tone],
        className,
      )}
    >
      <Icon className="size-7" />
      <span className="absolute -bottom-2 rounded-full border border-white/90 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-sm">
        {getInitials(label)}
      </span>
    </div>
  )
}
