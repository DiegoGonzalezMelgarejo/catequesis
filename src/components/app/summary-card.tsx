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
      <div className="flex min-w-0 items-start gap-3">
        <div className="shrink-0 rounded-[0.95rem] bg-secondary p-3 text-primary">
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-sm font-medium leading-tight text-muted-foreground">{title}</p>
            {to ? <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : null}
          </div>
          <p className="mt-2 break-words text-xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">{value}</p>
          {caption ? <p className="mt-1 max-w-[16rem] text-sm leading-snug text-muted-foreground">{caption}</p> : null}
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
