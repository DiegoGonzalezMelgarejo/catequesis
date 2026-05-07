import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AppCard } from '@/components/app/app-card'
import { cn } from '@/utils/cn'

type SummaryCardProps = {
  title: string
  value: string | number
  caption?: string
  icon: LucideIcon
  to?: string
}

export function SummaryCard({ title, value, caption, icon: Icon, to }: SummaryCardProps) {
  const content = (
    <AppCard className="h-full" interactive={Boolean(to)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {caption ? <p className="mt-2 max-w-[16rem] text-sm text-muted-foreground">{caption}</p> : null}
          {to ? (
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Ver lista
              <ArrowUpRight className="size-4" />
            </div>
          ) : null}
        </div>
        <div className="rounded-[1.25rem] bg-gradient-to-br from-primary/15 via-primary/10 to-cyan-400/10 p-3.5 text-primary shadow-sm">
          <Icon className="size-5" />
        </div>
      </div>
    </AppCard>
  )

  if (!to) {
    return content
  }

  return (
    <Link
      to={to}
      className={cn('block rounded-[1.5rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
    >
      {content}
    </Link>
  )
}
